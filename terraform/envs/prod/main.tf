###############################################################################
# envs/prod/main.tf
#
# Production environment — HA, multi-AZ, larger instances, full protection.
# Wires all modules together.
###############################################################################

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  project     = "resume-analyser"
  environment = "prod"
  name_prefix = "${local.project}-${local.environment}"
  account_id  = data.aws_caller_identity.current.account_id
  region      = data.aws_region.current.name

  # All 3 AZs for maximum HA
  azs = [
    "${var.aws_region}a",
    "${var.aws_region}b",
    "${var.aws_region}c",
  ]
}

################################################################################
# VPC
################################################################################

module "vpc" {
  source = "../../modules/vpc"

  name        = local.name_prefix
  cidr        = var.vpc_cidr
  azs         = local.azs
  project     = local.project
  environment = local.environment
  cluster_name = module.eks.cluster_name

  # Prod: one NAT Gateway per AZ — no single point of failure for egress traffic
  single_nat_gateway = false
}

################################################################################
# EKS
################################################################################

module "eks" {
  source = "../../modules/eks"

  cluster_name = local.name_prefix
  k8s_version  = "1.30"
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnets
  project      = local.project
  environment  = local.environment

  node_instance_types = var.node_instance_types
  node_min_size       = var.node_min_size
  node_max_size       = var.node_max_size
  node_desired_size   = var.node_desired_size

  # IMPORTANT: restrict to your VPN/bastion CIDR ranges in prod
  cluster_endpoint_public_access_cidrs = var.cluster_endpoint_public_access_cidrs

  alb_controller_namespace       = "kube-system"
  alb_controller_service_account = "aws-load-balancer-controller"
  eso_namespace                  = "external-secrets"
  eso_service_account            = "external-secrets"
}

################################################################################
# RDS PostgreSQL 16 — Multi-AZ, large instance, deletion protection
################################################################################

module "rds" {
  source = "../../modules/rds"

  identifier                 = local.name_prefix
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.intra_subnets
  eks_node_security_group_id = module.eks.node_security_group_id
  project                    = local.project
  environment                = local.environment

  instance_class = var.rds_instance_class

  # Prod: HA, deletion protection, keep final snapshot
  multi_az            = true
  deletion_protection = true
  skip_final_snapshot = false
}

################################################################################
# ElastiCache Redis 7 — 2 nodes (1 primary + 1 replica), multi-AZ failover
################################################################################

module "redis" {
  source = "../../modules/redis"

  cluster_id                 = "${local.project}-prod"
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.intra_subnets
  eks_node_security_group_id = module.eks.node_security_group_id
  project                    = local.project
  environment                = local.environment

  node_type        = var.redis_node_type
  num_cache_nodes  = 2         # 1 primary + 1 replica
  multi_az_enabled = true      # Replica in a different AZ
}

################################################################################
# S3 — Resume Storage (production hardened)
################################################################################

module "s3_resumes" {
  source = "../../modules/s3"

  bucket_name   = "${local.name_prefix}-resumes-${var.resume_bucket_suffix}"
  sse_algorithm = "aws:kms"    # Customer-managed KMS key
  force_destroy = false        # Never auto-delete objects in production
  project       = local.project
  environment   = local.environment
}

################################################################################
# ECR Repositories — Immutable tags for prod (no overwriting release tags)
################################################################################

module "ecr" {
  source = "../../modules/ecr"

  name_prefix          = local.project
  repos                = ["api", "worker", "frontend"]
  image_tag_mutability = "IMMUTABLE"  # Prevent accidental tag overwrites
  encryption_type      = "KMS"        # Customer-managed KMS encryption
  force_delete         = false        # Protect repos from accidental destroy
  project              = local.project
  environment          = local.environment
}

################################################################################
# App IRSA Role
################################################################################

module "app_iam" {
  source = "../../modules/iam"

  role_name_prefix          = local.name_prefix
  oidc_provider_arn         = module.eks.oidc_provider_arn
  oidc_provider_url         = module.eks.oidc_provider_url
  resume_bucket_arn         = module.s3_resumes.bucket_arn
  resume_bucket_kms_key_arn = module.s3_resumes.kms_key_arn
  project                   = local.project
  environment               = local.environment

  app_namespace       = "resume-analyser"
  app_service_account = "resume-analyser-api"
}
