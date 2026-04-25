# AI Resume Analyser — Kubernetes Manifests (Kustomize)

Plain Kubernetes manifests managed with [Kustomize](https://kustomize.io/). Use this approach when you prefer raw YAML over Helm templating, or as the source of truth consumed by a GitOps tool (Argo CD, Flux).

## Directory Structure

```
k8s/
├── base/                        # Common manifests for all environments
│   ├── namespace.yaml
│   ├── configmap.yaml           # Non-sensitive env vars
│   ├── secret.yaml              # Placeholder — replace with Sealed Secrets or ESO
│   ├── serviceaccount.yaml      # IRSA-annotated SA for API + Worker
│   ├── networkpolicy.yaml       # Default-deny + explicit allow rules
│   ├── api-deployment.yaml      # FastAPI (replicas=2, init container, probes)
│   ├── api-service.yaml         # ClusterIP port 80 → 8000
│   ├── api-hpa.yaml             # HPA 2–10 pods, CPU 70%
│   ├── api-pdb.yaml             # PodDisruptionBudget minAvailable=1
│   ├── worker-deployment.yaml   # Celery worker (replicas=2)
│   ├── worker-hpa.yaml          # Worker HPA 2–8 pods
│   ├── frontend-deployment.yaml # nginx + React build (replicas=2)
│   ├── frontend-service.yaml    # ClusterIP port 80
│   ├── ingress.yaml             # AWS ALB Ingress
│   └── kustomization.yaml
└── overlays/
    ├── dev/                     # 1 replica, DEBUG log, internal ALB
    │   └── kustomization.yaml
    ├── staging/                 # 2 replicas, internal ALB
    │   └── kustomization.yaml
    └── prod/                    # 3 replicas, full HPA, PDB
        └── kustomization.yaml
```

## Prerequisites

Install the following in your EKS cluster before applying manifests:

### 1. AWS Load Balancer Controller

Provisions ALBs from `Ingress` resources.

```bash
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=<YOUR_CLUSTER_NAME> \
  --set serviceAccount.create=true \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=<LBC_IAM_ROLE_ARN>
```

Docs: https://kubernetes-sigs.github.io/aws-load-balancer-controller/

### 2. External Secrets Operator (recommended for production)

Syncs secrets from AWS Secrets Manager into Kubernetes Secrets.

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace
```

After installing, create a `ClusterSecretStore` pointing to AWS Secrets Manager, then replace `k8s/base/secret.yaml` with an `ExternalSecret` resource (see comments in the file).

Docs: https://external-secrets.io/

### 3. Metrics Server

Required for HPA CPU/memory autoscaling.

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 4. ACM Certificate

Issue an ACM certificate for your domain and copy the ARN into:
- `k8s/base/ingress.yaml` (annotation `alb.ingress.kubernetes.io/certificate-arn`)
- Or the overlay-specific ingress patch

### 5. IRSA Role

Create an IAM role for the service account:

```bash
eksctl create iamserviceaccount \
  --cluster <CLUSTER_NAME> \
  --namespace resume-analyser \
  --name resume-analyser-api \
  --attach-policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/ResumeAnalyserApiPolicy \
  --approve
```

Update `k8s/base/serviceaccount.yaml` with the resulting role ARN.

---

## Quickstart

### Apply a specific overlay

```bash
# Preview what will be applied
kubectl kustomize k8s/overlays/dev

# Apply dev overlay
kubectl apply -k k8s/overlays/dev

# Apply staging
kubectl apply -k k8s/overlays/staging

# Apply production
kubectl apply -k k8s/overlays/prod
```

### Set image tags at deploy time

Kustomize `images` directives in each overlay control the image tag. Override via CLI:

```bash
# Using kustomize CLI directly
kustomize edit set image \
  "${REGISTRY}/resume-analyser-api:${GIT_SHA}" \
  --overlay k8s/overlays/prod

kubectl apply -k k8s/overlays/prod

# Or use --kustomize with kubectl (kustomize built-in)
kubectl apply -k k8s/overlays/prod
```

For CI/CD pipelines (GitHub Actions, GitLab CI, ArgoCD), update the `images[*].newTag` in the overlay `kustomization.yaml` and commit/push.

### Verify the deployment

```bash
# Check all pods
kubectl get pods -n resume-analyser

# Watch rollout
kubectl rollout status deployment/resume-analyser-api -n resume-analyser
kubectl rollout status deployment/resume-analyser-worker -n resume-analyser
kubectl rollout status deployment/resume-analyser-frontend -n resume-analyser

# Get the ALB DNS name
kubectl get ingress resume-analyser -n resume-analyser

# Test health
curl https://resume-analyser.example.com/api/v1/healthz
```

### Roll back a deployment

```bash
kubectl rollout undo deployment/resume-analyser-api -n resume-analyser
kubectl rollout history deployment/resume-analyser-api -n resume-analyser
```

---

## Secret Management

The file `k8s/base/secret.yaml` is a **placeholder template only**. It contains no real credentials. Use one of the following patterns:

### Option A — External Secrets Operator (recommended)

1. Install ESO and create a `ClusterSecretStore` for AWS Secrets Manager.
2. Store secrets in Secrets Manager at `prod/resume-analyser` with keys:
   - `database_url`, `redis_url`, `celery_broker_url`, `celery_result_backend`, `secret_key`, `openai_api_key`
3. Replace `k8s/base/secret.yaml` with an `ExternalSecret` resource (template provided in the file comments).

### Option B — Bitnami Sealed Secrets

```bash
# Install sealed-secrets controller
helm install sealed-secrets \
  oci://registry-1.docker.io/bitnamicharts/sealed-secrets \
  -n kube-system

# Fetch the public key
kubeseal --fetch-cert \
  --controller-name=sealed-secrets \
  --controller-namespace=kube-system > pub-cert.pem

# Seal the secret
kubectl create secret generic resume-analyser-secrets \
  --from-literal=DATABASE_URL='postgresql+psycopg://...' \
  --from-literal=SECRET_KEY='...' \
  --dry-run=client -o yaml | \
  kubeseal --cert pub-cert.pem -o yaml > k8s/base/sealed-secret.yaml

kubectl apply -f k8s/base/sealed-secret.yaml
```

The sealed secret YAML is safe to commit to version control.

---

## GitOps with Argo CD

```yaml
# argocd-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ai-resume-analyser-prod
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/ai-resume-analyser-pro
    targetRevision: main
    path: k8s/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: resume-analyser
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

---

## Namespace Isolation

| Overlay  | Namespace              | ALB Scheme |
|----------|------------------------|------------|
| dev      | resume-analyser-dev    | internal   |
| staging  | resume-analyser-staging| internal   |
| prod     | resume-analyser        | internet-facing |

Network policies enforce default-deny ingress within each namespace with explicit allow rules for the ALB controller, Prometheus, and inter-pod communication.

---

## Resource Summary

| Component | Requests        | Limits          | Replicas (prod) |
|-----------|-----------------|-----------------|-----------------|
| api       | 500m CPU/512Mi  | 1500m CPU/2Gi   | 3 (HPA 3–10)    |
| worker    | 500m CPU/1Gi    | 2000m CPU/4Gi   | 3 (HPA 3–8)     |
| frontend  | 50m CPU/64Mi    | 200m CPU/256Mi  | 3               |
