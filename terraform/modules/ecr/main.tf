###############################################################################
# modules/ecr/main.tf
#
# Creates ECR repositories for each image in var.repos using for_each.
# Features:
#   - Image scanning on push (basic scanning; enable enhanced for Inspector)
#   - IMMUTABLE tags in prod, MUTABLE in dev (configurable)
#   - Encryption with KMS or AES256
#   - Lifecycle policy:
#       * Keep last 30 tagged images
#       * Expire untagged images older than 14 days
###############################################################################

locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  # Lifecycle policy JSON — same policy applied to all repos
  lifecycle_policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Remove untagged images older than 14 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 14
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep only the last 30 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "sha-", "release-", "build-"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      },
    ]
  })
}

################################################################################
# ECR Repositories
################################################################################

resource "aws_ecr_repository" "this" {
  for_each = toset(var.repos)

  name                 = "${var.name_prefix}/${each.key}"
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = var.encryption_type
    kms_key         = var.encryption_type == "KMS" ? aws_kms_key.ecr[0].arn : null
  }

  force_delete = var.force_delete

  tags = merge(local.common_tags, { Repository = each.key })
}

# Apply lifecycle policy to each repository
resource "aws_ecr_lifecycle_policy" "this" {
  for_each = toset(var.repos)

  repository = aws_ecr_repository.this[each.key].name
  policy     = local.lifecycle_policy
}

################################################################################
# KMS Key for ECR (only when encryption_type = "KMS")
################################################################################

resource "aws_kms_key" "ecr" {
  count = var.encryption_type == "KMS" ? 1 : 0

  description             = "KMS key for ECR repositories — ${var.name_prefix}"
  deletion_window_in_days = 14
  enable_key_rotation     = true

  tags = merge(local.common_tags, { Name = "${var.name_prefix}-ecr" })
}

resource "aws_kms_alias" "ecr" {
  count = var.encryption_type == "KMS" ? 1 : 0

  name          = "alias/${replace(var.name_prefix, "/", "-")}-ecr"
  target_key_id = aws_kms_key.ecr[0].key_id
}

################################################################################
# ECR Registry-level scanning configuration (account-wide enhanced scanning)
# Uncomment to enable AWS Inspector enhanced scanning for all repos.
################################################################################

# resource "aws_ecr_registry_scanning_configuration" "this" {
#   scan_type = "ENHANCED"
#
#   rule {
#     scan_frequency = "SCAN_ON_PUSH"
#
#     repository_filter {
#       filter      = "*"
#       filter_type = "WILDCARD"
#     }
#   }
# }
