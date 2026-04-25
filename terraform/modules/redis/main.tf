###############################################################################
# modules/redis/main.tf
#
# ElastiCache Redis 7 replication group.
# Features:
#   - Cluster mode DISABLED (single shard, multiple replicas)
#   - 1 primary + var.num_cache_nodes-1 replicas
#   - Encryption in transit (TLS) and at rest (KMS)
#   - Automatic failover (requires >= 2 nodes)
#   - Security group allowing port 6379 from EKS worker nodes only
###############################################################################

data "aws_caller_identity" "current" {}

locals {
  # Automatic failover requires at least 2 nodes (primary + replica)
  automatic_failover_enabled = var.num_cache_nodes >= 2
  multi_az_enabled           = var.num_cache_nodes >= 2 && var.multi_az_enabled

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

################################################################################
# KMS Key for ElastiCache at-rest encryption
################################################################################

resource "aws_kms_key" "redis" {
  description             = "KMS key for ElastiCache Redis encryption — ${var.cluster_id}"
  deletion_window_in_days = 14
  enable_key_rotation     = true

  tags = merge(local.common_tags, { Name = "${var.cluster_id}-redis" })
}

resource "aws_kms_alias" "redis" {
  name          = "alias/${var.cluster_id}-redis"
  target_key_id = aws_kms_key.redis.key_id
}

################################################################################
# Subnet Group (uses intra/private subnets)
################################################################################

resource "aws_elasticache_subnet_group" "this" {
  name        = "${var.cluster_id}-subnet-group"
  description = "Subnet group for ElastiCache Redis cluster ${var.cluster_id}"
  subnet_ids  = var.subnet_ids

  tags = merge(local.common_tags, { Name = "${var.cluster_id}-subnet-group" })
}

################################################################################
# Security Group
################################################################################

module "redis_sg" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 5.1"

  name        = "${var.cluster_id}-redis-sg"
  description = "Security group for ElastiCache Redis ${var.cluster_id}. Allows port 6379 from EKS node security group."
  vpc_id      = var.vpc_id

  ingress_with_source_security_group_id = [
    {
      rule                     = "redis-tcp"
      source_security_group_id = var.eks_node_security_group_id
      description              = "Redis from EKS worker nodes"
    },
  ]

  egress_rules = ["all-all"]

  tags = local.common_tags
}

################################################################################
# ElastiCache Parameter Group
################################################################################

resource "aws_elasticache_parameter_group" "this" {
  name        = "${var.cluster_id}-redis7"
  family      = "redis7"
  description = "Custom parameter group for Redis 7 — ${var.cluster_id}"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "activedefrag"
    value = "yes"
  }

  tags = merge(local.common_tags, { Name = "${var.cluster_id}-redis7" })

  lifecycle {
    create_before_destroy = true
  }
}

################################################################################
# ElastiCache Replication Group (Redis 7)
################################################################################

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = var.cluster_id
  description          = "Redis 7 replication group for ${var.cluster_id} (${var.environment})"

  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.node_type
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.this.name

  # Cluster mode disabled — single shard with optional replicas
  num_cache_clusters = var.num_cache_nodes

  # HA settings (only valid when num_cache_clusters >= 2)
  automatic_failover_enabled = local.automatic_failover_enabled
  multi_az_enabled           = local.multi_az_enabled

  # Network
  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = [module.redis_sg.security_group_id]

  # Encryption
  transit_encryption_enabled = true
  at_rest_encryption_enabled = true
  kms_key_id                 = aws_kms_key.redis.arn

  # Maintenance
  maintenance_window         = "sun:05:00-sun:06:00"
  snapshot_window            = "04:00-05:00"
  snapshot_retention_limit   = 3
  apply_immediately          = false
  auto_minor_version_upgrade = true

  # Auth token for in-transit encryption (stored in Secrets Manager separately)
  # NOTE: Enable auth_token if you want Redis AUTH password in addition to TLS.
  # auth_token = var.auth_token  # Uncomment and wire up if needed.

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = local.common_tags
}

################################################################################
# CloudWatch Log Groups for Redis
################################################################################

resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/${var.cluster_id}/slow-log"
  retention_in_days = 30
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "redis_engine" {
  name              = "/aws/elasticache/${var.cluster_id}/engine-log"
  retention_in_days = 30
  tags              = local.common_tags
}
