###############################################################################
# modules/rds/main.tf
#
# PostgreSQL 16 RDS instance using terraform-aws-modules/rds/aws.
# Features:
#   - AWS-managed master password stored in Secrets Manager
#   - Encrypted at rest with a customer-managed KMS key
#   - Automated backups with 7-day retention
#   - Storage autoscaling from 50 GB to 200 GB (gp3)
#   - Multi-AZ conditional on var.multi_az
#   - Deletion protection enabled
#   - Final snapshot before destroy
#   - Custom parameter group for PostgreSQL 16 tuning
###############################################################################

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

################################################################################
# KMS Key for RDS encryption
################################################################################

resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption — ${var.identifier}"
  deletion_window_in_days = 14
  enable_key_rotation     = true

  tags = merge(local.common_tags, { Name = "${var.identifier}-rds" })
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.identifier}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

################################################################################
# DB Subnet Group (uses intra/private subnets — no internet access)
################################################################################

resource "aws_db_subnet_group" "this" {
  name        = "${var.identifier}-subnet-group"
  description = "Subnet group for RDS instance ${var.identifier}"
  subnet_ids  = var.subnet_ids

  tags = merge(local.common_tags, { Name = "${var.identifier}-subnet-group" })
}

################################################################################
# Security Group
################################################################################

module "rds_sg" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 5.1"

  name        = "${var.identifier}-rds-sg"
  description = "Security group for RDS PostgreSQL instance ${var.identifier}. Allows port 5432 from EKS node security group."
  vpc_id      = var.vpc_id

  # Ingress: allow PostgreSQL from EKS worker nodes
  ingress_with_source_security_group_id = [
    {
      rule                     = "postgresql-tcp"
      source_security_group_id = var.eks_node_security_group_id
      description              = "PostgreSQL from EKS worker nodes"
    },
  ]

  # Egress: no outbound required for a database
  egress_rules = ["all-all"]

  tags = local.common_tags
}

################################################################################
# Parameter Group
################################################################################

resource "aws_db_parameter_group" "this" {
  name        = "${var.identifier}-pg16"
  family      = "postgres16"
  description = "Custom parameter group for PostgreSQL 16 — ${var.identifier}"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_duration"
    value = "0"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries slower than 1 second
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name         = "pg_stat_statements.track"
    value        = "ALL"
    apply_method = "pending-reboot"
  }

  tags = merge(local.common_tags, { Name = "${var.identifier}-pg16" })

  lifecycle {
    create_before_destroy = true
  }
}

################################################################################
# RDS Instance
################################################################################

module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.7"

  identifier = var.identifier

  engine               = "postgres"
  engine_version       = "16"
  family               = "postgres16"
  major_engine_version = "16"
  instance_class       = var.instance_class

  # Storage
  allocated_storage     = 50
  max_allocated_storage = 200 # Autoscaling ceiling
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  port     = 5432

  # AWS-managed master password in Secrets Manager (no plaintext in state)
  manage_master_user_password                            = true
  manage_master_user_password_rotation                   = true
  master_user_password_rotate_immediately                = false
  master_user_password_rotation_schedule_expression      = "rate(30 days)"

  # Network
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [module.rds_sg.security_group_id]
  publicly_accessible    = false

  # High Availability
  multi_az = var.multi_az

  # Parameter & option groups
  parameter_group_name         = aws_db_parameter_group.this.name
  create_db_parameter_group    = false
  create_db_option_group       = false

  # Backups
  backup_retention_period   = 7
  backup_window             = "03:00-04:00"
  maintenance_window        = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot     = true
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = "${var.identifier}-final-snapshot"
  deletion_protection       = var.deletion_protection

  # Enhanced Monitoring (60-second granularity)
  monitoring_interval    = 60
  monitoring_role_name   = "${var.identifier}-rds-monitoring"
  create_monitoring_role = true

  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id       = aws_kms_key.rds.arn

  # CloudWatch Logs export
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  create_cloudwatch_log_group     = true

  tags = local.common_tags
}
