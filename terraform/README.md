# AI Resume Analyser — Terraform Infrastructure

Production-grade AWS infrastructure for the AI Resume Analyser application, provisioned with Terraform >= 1.5.

## Architecture Overview

```
                          ┌─────────────────────────────────────────────────────┐
                          │                     AWS Account                     │
                          │                                                     │
                          │  ┌─────────────────────────────────────────────┐   │
                          │  │                   VPC (3 AZs)                │   │
                          │  │                                               │   │
Internet ──── ALB ────────┼──┼──► EKS (private subnets, managed node group) │   │
                          │  │           │            │            │          │   │
                          │  │      Intra Subnets (no NAT, DB tier)          │   │
                          │  │           │            │                       │   │
                          │  │          RDS         Redis                     │   │
                          │  │       (Postgres 16)  (Redis 7)                 │   │
                          │  └─────────────────────────────────────────────┘   │
                          │                                                     │
                          │  ECR (api, worker, frontend)   S3 (resumes)        │
                          │  Secrets Manager (/resume-analyser/*)               │
                          │  Bedrock (Claude 3.5, Titan Embeddings)             │
                          └─────────────────────────────────────────────────────┘
```

## Prerequisites

| Tool | Minimum Version | Installation |
|------|----------------|--------------|
| Terraform | 1.5.0 | https://developer.hashicorp.com/terraform/install |
| AWS CLI | 2.x | https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html |
| kubectl | 1.30+ | https://kubernetes.io/docs/tasks/tools/ |
| helm | 3.14+ | https://helm.sh/docs/intro/install/ |

Ensure your AWS credentials are configured and your IAM identity has sufficient permissions (AdministratorAccess or a custom policy covering EKS, EC2, RDS, ElastiCache, S3, ECR, IAM, KMS, SecretsManager, CloudWatch).

```bash
aws configure
aws sts get-caller-identity   # Verify credentials
```

---

## Step 1 — Bootstrap the State Backend (run once)

Before running `terraform init`, create the S3 bucket and DynamoDB table for remote state.

```bash
REGION="us-east-1"
STATE_BUCKET="my-tfstate-$(aws sts get-caller-identity --query Account --output text)"

# Create state bucket
aws s3api create-bucket \
  --bucket "$STATE_BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket "$STATE_BUCKET" \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket "$STATE_BUCKET" \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Block public access
aws s3api put-public-access-block \
  --bucket "$STATE_BUCKET" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION"

echo "State backend ready. Bucket: $STATE_BUCKET"
```

Then edit `envs/dev/backend.tf` and `envs/prod/backend.tf` — uncomment the `terraform { backend "s3" { ... } }` block and fill in your bucket name.

---

## Step 2 — Configure Variables

```bash
# Dev
cd envs/dev
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values (especially resume_bucket_suffix)

# Prod
cd ../prod
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — IMPORTANT: set cluster_endpoint_public_access_cidrs to your VPN CIDRs
```

---

## Step 3 — Terraform Init / Plan / Apply

### Deploy Dev first

```bash
cd envs/dev

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Deploy Prod

```bash
cd ../prod

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

> **Apply order note:** There are no cross-environment dependencies, so dev and prod can be applied independently. Within each environment, Terraform resolves the correct resource creation order automatically (VPC → EKS → RDS/Redis → S3/ECR/IAM).

---

## Step 4 — Post-Apply Steps

After `terraform apply` completes, run these steps to finish configuring the cluster.

### 4.1 Configure kubectl

```bash
# The exact command is also in the `configure_kubectl` Terraform output
aws eks update-kubeconfig \
  --name resume-analyser-dev \
  --region us-east-1

kubectl get nodes   # Should show Running nodes
```

### 4.2 Install the AWS Load Balancer Controller

```bash
# Get the ALB controller IAM role ARN from Terraform output
ALB_ROLE_ARN=$(terraform -chdir=envs/dev output -raw eks_alb_controller_role_arn)

helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName=resume-analyser-dev \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set "serviceAccount.annotations.eks\.amazonaws\.com/role-arn=$ALB_ROLE_ARN"

kubectl -n kube-system rollout status deployment/aws-load-balancer-controller
```

### 4.3 Install External Secrets Operator

```bash
ESO_ROLE_ARN=$(terraform -chdir=envs/dev output -raw eks_eso_role_arn)

helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="$ESO_ROLE_ARN"

kubectl -n external-secrets rollout status deployment/external-secrets
```

### 4.4 Create Application Namespace and Service Account

```bash
APP_ROLE_ARN=$(terraform -chdir=envs/dev output -raw app_irsa_role_arn)

kubectl create namespace resume-analyser

kubectl create serviceaccount resume-analyser-api \
  --namespace resume-analyser

kubectl annotate serviceaccount resume-analyser-api \
  --namespace resume-analyser \
  "eks.amazonaws.com/role-arn=$APP_ROLE_ARN"
```

### 4.5 Push Images to ECR

```bash
# Get ECR URLs from Terraform output
terraform -chdir=envs/dev output ecr_repo_urls

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"

# Authenticate Docker to ECR
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin \
  "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# Build and push each service
for SVC in api worker frontend; do
  docker build -t "resume-analyser/$SVC:latest" "./$SVC"
  docker tag "resume-analyser/$SVC:latest" \
    "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/resume-analyser/$SVC:v1.0.0"
  docker push \
    "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/resume-analyser/$SVC:v1.0.0"
done
```

### 4.6 Create App Secrets in Secrets Manager

```bash
# Database password is managed automatically by RDS + AWS rotation.
# Create any application-level secrets manually:

aws secretsmanager create-secret \
  --name "/resume-analyser/dev/app-config" \
  --secret-string '{"REDIS_TLS":"true","BEDROCK_REGION":"us-east-1"}' \
  --region us-east-1
```

### 4.7 Install the Application via Helm

```bash
helm install resume-analyser ./helm \
  --namespace resume-analyser \
  --values ./helm/values-dev.yaml \
  --set image.api.tag=v1.0.0 \
  --set image.worker.tag=v1.0.0 \
  --set image.frontend.tag=v1.0.0
```

---

## Terraform Destroy

> **Warning:** Destroying production infrastructure is irreversible. The RDS instance in prod has `deletion_protection = true` — you must disable it first.

### Disable RDS deletion protection (prod only)

```bash
aws rds modify-db-instance \
  --db-instance-identifier resume-analyser-prod \
  --no-deletion-protection \
  --apply-immediately
```

### Destroy order

```bash
# Destroy dev
cd envs/dev
terraform destroy

# Destroy prod (only after disabling deletion protection)
cd ../prod
terraform destroy
```

> Note: ECR repositories (`force_delete = false` in prod) and S3 buckets (`force_destroy = false` in prod) must be emptied manually before `terraform destroy` can complete.

---

## Cost Estimate

All prices are approximate US East (N. Virginia) on-demand rates. Actual costs depend on usage, data transfer, and reserved instance purchases.

| Resource | Dev (monthly) | Prod (monthly) |
|----------|--------------|----------------|
| EKS Control Plane | $73 | $73 |
| EC2 Worker Nodes | 2x t3.medium → ~$60 | 3x m6i.large → ~$330 |
| NAT Gateway | 1x → ~$35 | 3x → ~$105 |
| RDS PostgreSQL (db.t4g.micro, single-AZ) | ~$14 | db.t4g.medium, Multi-AZ → ~$110 |
| ElastiCache Redis (cache.t4g.micro, 1 node) | ~$13 | cache.r7g.large, 2 nodes → ~$290 |
| S3 (10 GB + requests) | ~$1 | ~$5 |
| ECR (3 repos, ~5 GB) | ~$0.50 | ~$0.50 |
| CloudWatch Logs/Metrics | ~$5 | ~$20 |
| KMS Keys | ~$1 | ~$5 |
| Secrets Manager | ~$0.40 | ~$0.40 |
| Bedrock (usage-based) | variable | variable |
| **Estimated Total** | **~$203/month** | **~$940/month** |

Cost optimisation tips:
- Use Savings Plans or Reserved Instances for EC2/RDS (up to 40–60% discount).
- Enable Karpenter for automatic node right-sizing.
- Use S3 Intelligent-Tiering instead of manual lifecycle rules for unpredictable access.
- Enable RDS automated backups to S3 (cheaper than read replicas for disaster recovery).

---

## Module Reference

| Module | Source | Purpose |
|--------|--------|---------|
| `modules/vpc` | `terraform-aws-modules/vpc/aws ~> 5.8` | VPC, subnets, NAT GWs, flow logs |
| `modules/eks` | `terraform-aws-modules/eks/aws ~> 20.11` | EKS cluster, node group, addons, IRSA |
| `modules/rds` | `terraform-aws-modules/rds/aws ~> 6.7` | PostgreSQL 16, encryption, backups |
| `modules/redis` | `aws_elasticache_replication_group` | Redis 7 with TLS, KMS, failover |
| `modules/s3` | `aws_s3_bucket` | Private resume bucket, SSE-KMS, lifecycle |
| `modules/ecr` | `aws_ecr_repository` | 3 repos with lifecycle policies |
| `modules/iam` | `aws_iam_role` | App IRSA: S3 + Bedrock + SecretsManager |

---

## Security Notes

- All data at rest is encrypted with KMS CMKs (key rotation enabled).
- All data in transit uses TLS (Redis `transit_encryption_enabled`, RDS SSL, S3 bucket policy deny HTTP).
- RDS master password is managed by AWS Secrets Manager with 30-day auto-rotation.
- EKS IRSA roles are scoped to specific namespace + service account pairs.
- ECR repos have IMMUTABLE tags in prod to prevent supply chain attacks.
- VPC flow logs are enabled for network audit.
- No hardcoded AWS account IDs — all use `data.aws_caller_identity.current.account_id`.
