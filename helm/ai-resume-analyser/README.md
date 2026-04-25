# AI Resume Analyser — Helm Chart

Production-grade Helm chart (API v2) for the AI Resume Analyser platform. Deploys a FastAPI backend, Celery worker, and nginx-served React frontend on EKS. Relies on external AWS RDS (PostgreSQL) and ElastiCache (Redis) — no in-cluster databases are provisioned.

## Chart Details

| Field      | Value                  |
|------------|------------------------|
| apiVersion | v2                     |
| type       | application            |
| version    | 0.1.0                  |
| appVersion | 1.0.0                  |

## Prerequisites

- Kubernetes ≥ 1.27
- Helm ≥ 3.12
- [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/) installed in the cluster
- [Metrics Server](https://github.com/kubernetes-sigs/metrics-server) installed (for HPA)
- AWS RDS PostgreSQL endpoint reachable from worker nodes
- AWS ElastiCache Redis endpoint reachable from worker nodes
- ACM certificate ARN for your domain (for HTTPS ingress)

**Optional but recommended for production:**
- [External Secrets Operator](https://external-secrets.io/) for AWS Secrets Manager integration
- [Prometheus Operator / kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) for ServiceMonitor support

---

## Installation

### Add and update dependencies (if any)

```bash
helm dependency update helm/ai-resume-analyser
```

### Install (development)

```bash
helm upgrade --install ai-resume-analyser helm/ai-resume-analyser \
  --namespace resume-analyser-dev \
  --create-namespace \
  -f helm/ai-resume-analyser/values-dev.yaml \
  --set api.image.tag="$(git rev-parse --short HEAD)" \
  --set worker.image.tag="$(git rev-parse --short HEAD)" \
  --set frontend.image.tag="$(git rev-parse --short HEAD)" \
  --set global.imageRegistry="123456789.dkr.ecr.us-east-1.amazonaws.com" \
  --set secrets.DATABASE_URL="postgresql+psycopg://user:pass@host:5432/db" \
  --set secrets.SECRET_KEY="$(openssl rand -hex 32)"
```

### Install (production with External Secrets Operator)

```bash
helm upgrade --install ai-resume-analyser helm/ai-resume-analyser \
  --namespace resume-analyser \
  --create-namespace \
  -f helm/ai-resume-analyser/values-prod.yaml \
  --set api.image.tag="1.0.0" \
  --set worker.image.tag="1.0.0" \
  --set frontend.image.tag="1.0.0" \
  --set global.imageRegistry="123456789.dkr.ecr.us-east-1.amazonaws.com" \
  --set serviceAccount.roleArn="arn:aws:iam::123456789:role/ResumeAnalyserApiRole" \
  --set ingress.certificateArn="arn:aws:acm:us-east-1:123456789:certificate/abc-def" \
  --set externalSecrets.enabled=true \
  --set externalSecrets.remoteSecretPath="prod/resume-analyser"
```

### Dry-run / template rendering

```bash
helm template ai-resume-analyser helm/ai-resume-analyser \
  -f helm/ai-resume-analyser/values-prod.yaml | less
```

### Lint the chart

```bash
helm lint helm/ai-resume-analyser -f helm/ai-resume-analyser/values-prod.yaml
```

### Run Helm tests (after install)

```bash
helm test ai-resume-analyser -n resume-analyser
```

---

## Upgrading

```bash
# Rolling update with new image tags
helm upgrade ai-resume-analyser helm/ai-resume-analyser \
  --namespace resume-analyser \
  -f helm/ai-resume-analyser/values-prod.yaml \
  --set api.image.tag="1.1.0" \
  --set worker.image.tag="1.1.0" \
  --set frontend.image.tag="1.1.0"

# Check history
helm history ai-resume-analyser -n resume-analyser

# Roll back to previous release
helm rollback ai-resume-analyser -n resume-analyser
```

---

## Uninstall

```bash
# Helm uninstall (Secrets are retained by default due to helm.sh/resource-policy: keep)
helm uninstall ai-resume-analyser -n resume-analyser

# Manually delete the namespace and retained secrets
kubectl delete namespace resume-analyser
```

---

## Values Reference

### Global

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `global.imageRegistry` | string | `""` | Global image registry prefix (e.g. `123456789.dkr.ecr.us-east-1.amazonaws.com`) |
| `global.imagePullSecrets` | list | `[]` | Image pull secrets for private registries |

### API Component

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `api.image.repository` | string | `resume-analyser-api` | Image repository |
| `api.image.tag` | string | `1.0.0` | Image tag |
| `api.image.pullPolicy` | string | `IfNotPresent` | Image pull policy |
| `api.replicaCount` | int | `2` | Number of replicas (ignored when HPA is enabled) |
| `api.command` | list | `["./scripts/run_prod.sh"]` | Container command |

### Worker Component

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `worker.image.repository` | string | `resume-analyser-worker` | Image repository |
| `worker.image.tag` | string | `1.0.0` | Image tag |
| `worker.image.pullPolicy` | string | `IfNotPresent` | Image pull policy |
| `worker.replicaCount` | int | `2` | Number of replicas (ignored when HPA is enabled) |
| `worker.command` | list | `["./scripts/run_worker.sh"]` | Container command |

### Frontend Component

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `frontend.image.repository` | string | `resume-analyser-frontend` | Image repository |
| `frontend.image.tag` | string | `1.0.0` | Image tag |
| `frontend.image.pullPolicy` | string | `IfNotPresent` | Image pull policy |
| `frontend.replicaCount` | int | `2` | Number of replicas |

### Resources

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `resources.api.requests.cpu` | string | `500m` | API CPU request |
| `resources.api.requests.memory` | string | `512Mi` | API memory request |
| `resources.api.limits.cpu` | string | `1500m` | API CPU limit |
| `resources.api.limits.memory` | string | `2Gi` | API memory limit |
| `resources.worker.requests.cpu` | string | `500m` | Worker CPU request |
| `resources.worker.requests.memory` | string | `1Gi` | Worker memory request (sized for sentence-transformers) |
| `resources.worker.limits.cpu` | string | `2000m` | Worker CPU limit |
| `resources.worker.limits.memory` | string | `4Gi` | Worker memory limit |
| `resources.frontend.requests.cpu` | string | `50m` | Frontend CPU request |
| `resources.frontend.requests.memory` | string | `64Mi` | Frontend memory request |
| `resources.frontend.limits.cpu` | string | `200m` | Frontend CPU limit |
| `resources.frontend.limits.memory` | string | `256Mi` | Frontend memory limit |

### Autoscaling (HPA)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `autoscaling.api.enabled` | bool | `true` | Enable HPA for API |
| `autoscaling.api.minReplicas` | int | `2` | Minimum API replicas |
| `autoscaling.api.maxReplicas` | int | `10` | Maximum API replicas |
| `autoscaling.api.targetCPUUtilizationPercentage` | int | `70` | Target CPU utilisation |
| `autoscaling.api.targetMemoryUtilizationPercentage` | int | `80` | Target memory utilisation |
| `autoscaling.worker.enabled` | bool | `true` | Enable HPA for worker |
| `autoscaling.worker.minReplicas` | int | `2` | Minimum worker replicas |
| `autoscaling.worker.maxReplicas` | int | `8` | Maximum worker replicas |

### Service Account (IRSA)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `serviceAccount.create` | bool | `true` | Create a ServiceAccount |
| `serviceAccount.name` | string | `""` | Override the SA name |
| `serviceAccount.roleArn` | string | `""` | IAM role ARN for IRSA annotation |
| `serviceAccount.annotations` | object | `{}` | Extra annotations |

### Namespace

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `namespace.create` | bool | `true` | Create the namespace |
| `namespace.name` | string | `resume-analyser` | Namespace name |

### Environment (ConfigMap)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `env.APP_ENV` | string | `production` | Application environment |
| `env.LOG_LEVEL` | string | `INFO` | Log level |
| `env.LLM_PROVIDER` | string | `openai` | LLM provider (openai/bedrock/local) |
| `env.EMBEDDING_PROVIDER` | string | `local` | Embedding provider |
| `env.AWS_REGION` | string | `us-east-1` | AWS region |
| `env.S3_BUCKET` | string | `ai-resume-analyser-prod` | S3 bucket name |
| `env.CORS_ORIGINS` | string | `https://resume-analyser.example.com` | Allowed CORS origins |
| `env.PROMETHEUS_ENABLED` | string | `true` | Enable Prometheus metrics |
| `env.OTEL_ENABLED` | string | `true` | Enable OpenTelemetry |
| `env.OTEL_EXPORTER_OTLP_ENDPOINT` | string | `http://otel-collector...` | OTLP endpoint |

### Secrets

> **Warning**: The `secrets` block is for development only. Use `externalSecrets.enabled=true` in production.

| Key | Description |
|-----|-------------|
| `secrets.DATABASE_URL` | PostgreSQL connection string |
| `secrets.REDIS_URL` | Redis connection string |
| `secrets.CELERY_BROKER_URL` | Celery broker URL |
| `secrets.CELERY_RESULT_BACKEND` | Celery result backend URL |
| `secrets.SECRET_KEY` | Application secret key (64+ chars) |
| `secrets.OPENAI_API_KEY` | OpenAI API key |

### External Secrets Operator

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `externalSecrets.enabled` | bool | `false` | Use ESO instead of plain Secret |
| `externalSecrets.secretStoreName` | string | `aws-secrets-manager` | SecretStore name |
| `externalSecrets.secretStoreKind` | string | `ClusterSecretStore` | SecretStore kind |
| `externalSecrets.remoteSecretPath` | string | `prod/resume-analyser` | AWS Secrets Manager path |
| `externalSecrets.refreshInterval` | string | `1h` | Secret refresh interval |

### Ingress

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `ingress.enabled` | bool | `true` | Enable Ingress |
| `ingress.className` | string | `alb` | IngressClass (alb for AWS LBC) |
| `ingress.host` | string | `resume-analyser.example.com` | Hostname |
| `ingress.certificateArn` | string | `""` | ACM certificate ARN |
| `ingress.annotations` | object | (see values.yaml) | ALB annotations |
| `ingress.tls` | list | `[]` | TLS configuration |

### Monitoring

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `monitoring.serviceMonitor.enabled` | bool | `false` | Create a Prometheus Operator ServiceMonitor |
| `monitoring.serviceMonitor.namespace` | string | `monitoring` | Namespace for the ServiceMonitor |
| `monitoring.serviceMonitor.interval` | string | `30s` | Scrape interval |
| `monitoring.serviceMonitor.scrapeTimeout` | string | `10s` | Scrape timeout |
| `monitoring.serviceMonitor.labels` | object | `{release: prometheus}` | Labels for Prometheus discovery |

### Pod Disruption Budget

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `podDisruptionBudget.api.enabled` | bool | `true` | Create PDB for API |
| `podDisruptionBudget.api.minAvailable` | int | `1` | Minimum available pods |

---

## IRSA Setup (IAM Roles for Service Accounts)

IRSA allows pods to assume an IAM role without embedding credentials. This is required for S3 access and optional for Bedrock.

### Step 1 — Create IAM policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::ai-resume-analyser-prod",
        "arn:aws:s3:::ai-resume-analyser-prod/*"
      ]
    },
    {
      "Sid": "BedrockAccess",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": "*"
    },
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:prod/resume-analyser*"
    }
  ]
}
```

Save as `resume-analyser-api-policy.json`, then:

```bash
aws iam create-policy \
  --policy-name ResumeAnalyserApiPolicy \
  --policy-document file://resume-analyser-api-policy.json
```

### Step 2 — Create the IRSA role with eksctl

```bash
eksctl create iamserviceaccount \
  --cluster <CLUSTER_NAME> \
  --namespace resume-analyser \
  --name resume-analyser-api \
  --attach-policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/ResumeAnalyserApiPolicy \
  --approve
```

### Step 3 — Pass the role ARN to Helm

```bash
helm upgrade --install ai-resume-analyser helm/ai-resume-analyser \
  --set serviceAccount.roleArn="arn:aws:iam::<ACCOUNT_ID>:role/eksctl-<CLUSTER>-addon-iamserviceaccount-..."
```

### Verify

```bash
kubectl exec -n resume-analyser \
  deploy/ai-resume-analyser-api -- \
  aws sts get-caller-identity
```

---

## External Secrets Setup (Production)

### Step 1 — Install External Secrets Operator

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace \
  --set installCRDs=true
```

### Step 2 — Create ClusterSecretStore

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
```

### Step 3 — Store secrets in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name prod/resume-analyser \
  --region us-east-1 \
  --secret-string '{
    "database_url": "postgresql+psycopg://user:pass@rds-endpoint:5432/resume_analyser",
    "redis_url": "redis://elasticache-endpoint:6379/0",
    "celery_broker_url": "redis://elasticache-endpoint:6379/1",
    "celery_result_backend": "redis://elasticache-endpoint:6379/2",
    "secret_key": "your-64-char-secret",
    "openai_api_key": "sk-..."
  }'
```

### Step 4 — Deploy with ESO enabled

```bash
helm upgrade --install ai-resume-analyser helm/ai-resume-analyser \
  -f values-prod.yaml \
  --set externalSecrets.enabled=true \
  --set externalSecrets.remoteSecretPath=prod/resume-analyser
```

---

## Observability

### Prometheus Metrics

Enable the ServiceMonitor (requires Prometheus Operator):

```bash
helm upgrade ai-resume-analyser helm/ai-resume-analyser \
  --set monitoring.serviceMonitor.enabled=true \
  --set monitoring.serviceMonitor.labels.release=prometheus
```

Metrics are exposed at `/metrics` on the API pods. Key metrics:
- `http_requests_total` — request count by path/status
- `http_request_duration_seconds` — latency histogram
- `celery_tasks_total` — Celery task counts
- `python_gc_*` — garbage collection stats

### OpenTelemetry Tracing

Set `env.OTEL_ENABLED=true` and `env.OTEL_EXPORTER_OTLP_ENDPOINT` to your OTLP collector endpoint.

---

## Template Files

| Template | Description |
|----------|-------------|
| `_helpers.tpl` | Named template helpers for labels, names, images |
| `configmap.yaml` | ConfigMap from `values.env` |
| `secret.yaml` | Plain Secret or ExternalSecret (based on `externalSecrets.enabled`) |
| `serviceaccount.yaml` | ServiceAccount with optional IRSA annotation |
| `api-deployment.yaml` | API Deployment with init container, probes, security context |
| `api-service.yaml` | API ClusterIP Service |
| `api-hpa.yaml` | API HorizontalPodAutoscaler |
| `api-pdb.yaml` | API PodDisruptionBudget |
| `worker-deployment.yaml` | Celery worker Deployment |
| `worker-hpa.yaml` | Worker HorizontalPodAutoscaler |
| `frontend-deployment.yaml` | Frontend (nginx) Deployment |
| `frontend-service.yaml` | Frontend ClusterIP Service |
| `ingress.yaml` | AWS ALB Ingress |
| `servicemonitor.yaml` | Prometheus Operator ServiceMonitor |
| `NOTES.txt` | Post-install instructions |
| `tests/test-api-health.yaml` | Helm test Pod (curls /api/v1/healthz) |
