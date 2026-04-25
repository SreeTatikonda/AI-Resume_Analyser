# Deployment Guide

Step-by-step guide to deploying AI Resume Analyser Pro on AWS EKS via Terraform + Helm.

---

## Prerequisites

| Tool | Version | Purpose |
| --- | --- | --- |
| AWS CLI | ≥ 2.15 | AWS authentication |
| Terraform | 1.7.x | Infrastructure provisioning |
| kubectl | 1.29.x | Kubernetes cluster management |
| Helm | 3.14.x | Chart deployment |
| Docker | 24.x | Container image building |
| cosign | 2.x | Optional image signing |

---

## 1. Terraform Bootstrap

### Configure AWS credentials

```bash
aws configure --profile resume-analyser
export AWS_PROFILE=resume-analyser
```

### Provision the dev environment

```bash
cd terraform/envs/dev
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

This creates:
- EKS cluster (`ai-resume-analyser`, version 1.29) with managed node groups
- RDS PostgreSQL 16 (Multi-AZ in prod)
- ElastiCache Redis 7 (cluster mode in prod)
- S3 bucket for PDFs + FAISS index
- ECR repositories: `ai-resume-analyser/api`, `/worker`, `/frontend`
- IAM roles: EKS node role, OIDC GitHub Actions role, Bedrock access role
- VPC with public/private subnets, NAT Gateway
- ACM certificate (requires Route 53 hosted zone)

### Capture outputs

```bash
terraform output -json > /tmp/tf-outputs.json

ECR_REGISTRY=$(jq -r '.ecr_registry.value' /tmp/tf-outputs.json)
EKS_CLUSTER=$(jq -r '.eks_cluster_name.value' /tmp/tf-outputs.json)
RDS_ENDPOINT=$(jq -r '.rds_endpoint.value' /tmp/tf-outputs.json)
```

---

## 2. ECR — Build and Push Images

### Sample build script

```bash
#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG=${1:-$(git rev-parse --short HEAD)}
PLATFORM="linux/amd64"

aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

# API
docker buildx build \
  --platform "$PLATFORM" \
  --file backend/Dockerfile \
  --target runtime \
  --tag "$ECR_REGISTRY/ai-resume-analyser/api:$IMAGE_TAG" \
  --tag "$ECR_REGISTRY/ai-resume-analyser/api:latest" \
  --push \
  backend/

# Worker
docker buildx build \
  --platform "$PLATFORM" \
  --file backend/Dockerfile.worker \
  --tag "$ECR_REGISTRY/ai-resume-analyser/worker:$IMAGE_TAG" \
  --tag "$ECR_REGISTRY/ai-resume-analyser/worker:latest" \
  --push \
  backend/

# Frontend
docker buildx build \
  --platform "$PLATFORM" \
  --file frontend/Dockerfile \
  --target runtime \
  --tag "$ECR_REGISTRY/ai-resume-analyser/frontend:$IMAGE_TAG" \
  --tag "$ECR_REGISTRY/ai-resume-analyser/frontend:latest" \
  --push \
  frontend/

echo "Pushed $ECR_REGISTRY/ai-resume-analyser/*:$IMAGE_TAG"
```

> In CI, this is handled automatically by `.github/workflows/build-and-push.yml` on every push to `main` or version tag.

---

## 3. Secrets Management

### Approach: External Secrets Operator + AWS Secrets Manager

1. Install ESO in the cluster:

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets --create-namespace
```

2. Store secrets in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name resume-analyser/prod/app \
  --secret-string '{
    "SECRET_KEY": "...",
    "DATABASE_URL": "postgresql+psycopg://...",
    "OPENAI_API_KEY": "sk-...",
    "REDIS_URL": "redis://..."
  }'
```

3. Create an `ExternalSecret` (included in the Helm chart):

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: ai-resume-analyser
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: ai-resume-analyser-secrets
  data:
    - secretKey: SECRET_KEY
      remoteRef:
        key: resume-analyser/prod/app
        property: SECRET_KEY
    # … (all other keys)
```

### Alternative: Sealed Secrets (Bitnami)

```bash
kubeseal --cert=pub-cert.pem --format=yaml < secret.yaml > sealed-secret.yaml
kubectl apply -f sealed-secret.yaml
```

---

## 4. EKS Kubeconfig

```bash
aws eks update-kubeconfig \
  --region us-east-1 \
  --name ai-resume-analyser \
  --alias resume-analyser-prod

kubectl get nodes   # verify
```

---

## 5. Helm Install

### Add chart repository (if published)

```bash
helm repo add ai-resume-analyser https://charts.sree-tatikonda.example.com
helm repo update
```

### Install from local chart

```bash
IMAGE_TAG=$(git rev-parse --short HEAD)

helm upgrade --install ai-resume-analyser helm/ai-resume-analyser \
  --namespace resume-analyser \
  --create-namespace \
  --values helm/ai-resume-analyser/values-prod.yaml \
  --set image.api.tag="$IMAGE_TAG" \
  --set image.api.registry="$ECR_REGISTRY" \
  --set image.worker.tag="$IMAGE_TAG" \
  --set image.worker.registry="$ECR_REGISTRY" \
  --set image.frontend.tag="$IMAGE_TAG" \
  --set image.frontend.registry="$ECR_REGISTRY" \
  --atomic \
  --timeout 10m \
  --wait
```

### Verify

```bash
helm status ai-resume-analyser -n resume-analyser
kubectl get pods -n resume-analyser
kubectl get ingress -n resume-analyser
```

---

## 6. DNS and ACM

1. Get the ALB DNS name:

```bash
ALB_DNS=$(kubectl get ingress -n resume-analyser \
  -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}')
echo $ALB_DNS
```

2. Create a CNAME record in Route 53:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.ai-resume-analyser.example.com",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "'"$ALB_DNS"'"}]
      }
    }]
  }'
```

3. ACM certificate is validated via DNS (Terraform creates the validation records automatically).

---

## 7. Smoke Tests

```bash
APP_URL=https://app.ai-resume-analyser.example.com

# Liveness
curl -fsSL "$APP_URL/api/v1/healthz" | jq .

# Readiness (checks DB + Redis)
curl -fsSL "$APP_URL/api/v1/readyz" | jq .

# Auth
TOKEN=$(curl -s -X POST "$APP_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"SmokeTest123!"}' \
  | jq -r '.access_token')

# Analysis
curl -X POST "$APP_URL/api/v1/analyses" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@tests/fixtures/sample_resume.pdf" \
  -F "job_description=Python Engineer with FastAPI and AWS" \
  | jq '{status, overall_score}'
```

---

## 8. Helm Test

```bash
helm test ai-resume-analyser --namespace resume-analyser --timeout 5m
```

The chart includes a `helm-test` pod that:
- Calls `/api/v1/healthz` and `/api/v1/readyz`
- Verifies Prometheus `/metrics` is reachable
- Checks Grafana responds on port 3000

---

## 9. Rollback Procedure

### Helm rollback (application)

```bash
# View history
helm history ai-resume-analyser -n resume-analyser

# Rollback to previous revision
helm rollback ai-resume-analyser 0 -n resume-analyser --wait

# Or to a specific revision
helm rollback ai-resume-analyser 3 -n resume-analyser --wait
```

### Database migration rollback

```bash
# SSH into API pod
kubectl exec -it deploy/api -n resume-analyser -- bash

# Downgrade one revision
alembic downgrade -1

# Or to a specific revision
alembic downgrade 0001_initial
```

### Terraform state rollback

Terraform does not natively rollback. To revert:
1. Identify the previous state in the Terraform state S3 backend.
2. Run `terraform state pull > before.tfstate` (from the previous CI run artifact).
3. Run `terraform state push before.tfstate`.
4. `terraform apply` to reconcile.

---

## Environment Matrix

| Setting | dev | staging | prod |
| --- | --- | --- | --- |
| EKS node type | t3.medium | t3.large | r7g.xlarge |
| API replicas | 1 | 2 | 2–10 (HPA) |
| Worker replicas | 1 | 1 | 1–5 (HPA) |
| RDS instance | db.t3.micro | db.t3.medium | db.r7g.large (Multi-AZ) |
| Redis | single node | single node | cluster mode (3 shards) |
| LLM provider | local | openai | bedrock |
| HTTPS | self-signed | ACM (staging cert) | ACM (production cert) |
| Secrets | .env file | ESO + Secrets Manager | ESO + Secrets Manager |
| Log retention | 7 days | 30 days | 90 days |

---

## Upgrading

```bash
# 1. Bump version in pyproject.toml / package.json
# 2. Create a version tag
git tag v1.1.0 && git push origin v1.1.0

# GitHub Actions will:
# - Run ci.yml (lint + test + security)
# - build-and-push.yml tags images with v1.1.0
# - deploy.yml auto-deploys to prod (requires env protection approval)
# - release.yml creates GitHub Release with changelog
```
