###############################################################################
# envs/dev/outputs.tf
###############################################################################

# ── VPC ───────────────────────────────────────────────────────────────────────

output "vpc_id" {
  description = "ID of the VPC."
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "IDs of private subnets (EKS nodes)."
  value       = module.vpc.private_subnets
}

output "intra_subnet_ids" {
  description = "IDs of intra subnets (RDS, Redis)."
  value       = module.vpc.intra_subnets
}

# ── EKS ───────────────────────────────────────────────────────────────────────

output "eks_cluster_name" {
  description = "Name of the EKS cluster."
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS API server endpoint URL."
  value       = module.eks.cluster_endpoint
}

output "eks_oidc_provider_arn" {
  description = "OIDC provider ARN for IRSA."
  value       = module.eks.oidc_provider_arn
}

output "eks_alb_controller_role_arn" {
  description = "IRSA role ARN to annotate the ALB Controller service account with."
  value       = module.eks.alb_controller_role_arn
}

output "eks_eso_role_arn" {
  description = "IRSA role ARN to annotate the ESO service account with."
  value       = module.eks.eso_role_arn
}

output "configure_kubectl" {
  description = "Run this command to configure kubectl for the dev cluster."
  value       = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${data.aws_region.current.name}"
}

# ── RDS ───────────────────────────────────────────────────────────────────────

output "rds_endpoint" {
  description = "RDS PostgreSQL connection endpoint."
  value       = module.rds.endpoint
}

output "rds_db_name" {
  description = "PostgreSQL database name."
  value       = module.rds.db_name
}

output "rds_master_user_secret_arn" {
  description = "ARN of the Secrets Manager secret holding the RDS master password."
  value       = module.rds.master_user_secret_arn
}

# ── Redis ─────────────────────────────────────────────────────────────────────

output "redis_primary_endpoint" {
  description = "Redis primary endpoint address."
  value       = module.redis.primary_endpoint
}

output "redis_port" {
  description = "Redis port."
  value       = module.redis.port
}

# ── S3 ────────────────────────────────────────────────────────────────────────

output "resume_bucket_name" {
  description = "Name of the S3 bucket for resume storage."
  value       = module.s3_resumes.bucket_id
}

output "resume_bucket_arn" {
  description = "ARN of the resume S3 bucket."
  value       = module.s3_resumes.bucket_arn
}

# ── ECR ───────────────────────────────────────────────────────────────────────

output "ecr_repo_urls" {
  description = "ECR repository URLs mapped by service name."
  value       = module.ecr.repo_urls
}

# ── IAM ───────────────────────────────────────────────────────────────────────

output "app_irsa_role_arn" {
  description = "IRSA role ARN for the application. Annotate the Kubernetes service account with: eks.amazonaws.com/role-arn: <this value>"
  value       = module.app_iam.role_arn
}
