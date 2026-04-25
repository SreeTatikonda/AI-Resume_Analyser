###############################################################################
# envs/dev/main.tf
#
# Development environment — cheap, single-AZ where possible.
# Wires all modules together.
###############################################################################

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  project     = "resume-analyser"
  environment = "dev"
  name_prefix = "${local.project}-${local.environment}"
  account_id  = data.aws_caller_identity.current.account_id
  region      = data.aws_region.current.name

  # Availability zones — uses 3 for subnet layout even in dev
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

  # Dev: single NAT Gateway saves ~$32/month vs one per AZ
  single_nat_gateway = true
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

  cluster_endpoint_public_access_cidrs = var.cluster_endpoint_public_access_cidrs

  # IRSA scoping (defaults match Helm chart defaults)
  alb_controller_namespace       = "kube-system"
  alb_controller_service_account = "aws-load-balancer-controller"
  eso_namespace                  = "external-secrets"
  eso_service_account            = "external-secrets"
}

################################################################################
# RDS PostgreSQL 16
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

  # Dev: no multi-AZ, no deletion protection (easy to tear down)
  multi_az            = false
  deletion_protection = false
  skip_final_snapshot = true
}

################################################################################
# ElastiCache Redis 7
################################################################################

module "redis" {
  source = "../../modules/redis"

  cluster_id                 = "${local.project}-dev"
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.intra_subnets
  eks_node_security_group_id = module.eks.node_security_group_id
  project                    = local.project
  environment                = local.environment

  node_type       = var.redis_node_type
  num_cache_nodes = 1   # Single node in dev — no HA required
  multi_az_enabled = false
}

################################################################################
# S3 — Resume Storage
################################################################################

module "s3_resumes" {
  source = "../../modules/s3"

  bucket_name   = "${local.name_prefix}-resumes-${var.resume_bucket_suffix}"
  sse_algorithm = "aws:kms"
  force_destroy = true # Dev: allow destroy even with objects
  project       = local.project
  environment   = local.environment
}

################################################################################
# ECR Repositories
################################################################################

module "ecr" {
  source = "../../modules/ecr"

  name_prefix          = local.project
  repos                = ["api", "worker", "frontend"]
  image_tag_mutability = "MUTABLE"   # Dev: allow tag overwrites for fast iteration
  encryption_type      = "AES256"    # Dev: simpler, no custom KMS key
  force_delete         = true        # Dev: allow destroy with images
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
