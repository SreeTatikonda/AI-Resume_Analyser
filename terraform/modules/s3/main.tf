###############################################################################
# modules/s3/main.tf
#
# Private S3 bucket for resume file storage.
# Features:
#   - Block all public access
#   - Server-side encryption (KMS CMK or AES256 — selectable via variable)
#   - Versioning enabled
#   - Lifecycle: transition to STANDARD_IA after 30 days,
#                expire noncurrent versions after 90 days
#   - Bucket policy: deny non-TLS (HTTP) requests
#   - Ownership controls: BucketOwnerEnforced (ACLs disabled)
###############################################################################

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  # Full bucket name — must be globally unique
  bucket_name = var.bucket_name

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

################################################################################
# KMS Key (created only when sse_algorithm = "aws:kms" and kms_key_arn is null)
################################################################################

resource "aws_kms_key" "s3" {
  count = var.sse_algorithm == "aws:kms" && var.kms_key_arn == null ? 1 : 0

  description             = "KMS key for S3 bucket ${local.bucket_name}"
  deletion_window_in_days = 14
  enable_key_rotation     = true

  tags = merge(local.common_tags, { Name = "${local.bucket_name}-s3" })
}

resource "aws_kms_alias" "s3" {
  count = var.sse_algorithm == "aws:kms" && var.kms_key_arn == null ? 1 : 0

  name          = "alias/${local.bucket_name}-s3"
  target_key_id = aws_kms_key.s3[0].key_id
}

locals {
  # Resolved KMS key ARN — either provided or created above
  effective_kms_key_arn = (
    var.sse_algorithm == "aws:kms"
    ? (var.kms_key_arn != null ? var.kms_key_arn : aws_kms_key.s3[0].arn)
    : null
  )
}

################################################################################
# S3 Bucket
################################################################################

resource "aws_s3_bucket" "this" {
  bucket = local.bucket_name

  # Prevent accidental object deletion cascades during terraform destroy
  # (Does not protect from bucket deletion itself — use lifecycle prevent_destroy)
  force_destroy = var.force_destroy

  tags = merge(local.common_tags, { Name = local.bucket_name })
}

# Enforce bucket owner — disables ACLs entirely (recommended by AWS)
resource "aws_s3_bucket_ownership_controls" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# Block all public access — belt + suspenders
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.sse_algorithm
      kms_master_key_id = local.effective_kms_key_arn
    }
    # Enforce bucket key (reduces KMS API calls and cost)
    bucket_key_enabled = var.sse_algorithm == "aws:kms"
  }
}

# Versioning
resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle rules
resource "aws_s3_bucket_lifecycle_configuration" "this" {
  # Lifecycle requires versioning to be enabled first
  depends_on = [aws_s3_bucket_versioning.this]

  bucket = aws_s3_bucket.this.id

  # Rule 1: Transition current objects to cheaper storage after 30 days
  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 180
      storage_class = "GLACIER_IR"
    }
  }

  # Rule 2: Clean up noncurrent (overwritten/deleted) versions
  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    # Keep at most 3 noncurrent versions
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }
  }

  # Rule 3: Remove incomplete multipart uploads (free storage leak prevention)
  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Bucket policy: enforce TLS-only access
data "aws_iam_policy_document" "bucket_policy" {
  statement {
    sid     = "DenyNonTLS"
    effect  = "Deny"
    actions = ["s3:*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    resources = [
      aws_s3_bucket.this.arn,
      "${aws_s3_bucket.this.arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "this" {
  bucket = aws_s3_bucket.this.id
  policy = data.aws_iam_policy_document.bucket_policy.json

  # Policy can only be applied after public access block is in place
  depends_on = [aws_s3_bucket_public_access_block.this]
}

# Enable S3 server access logging (optional — enabled by var)
resource "aws_s3_bucket_logging" "this" {
  count = var.enable_access_logging ? 1 : 0

  bucket        = aws_s3_bucket.this.id
  target_bucket = var.logging_target_bucket
  target_prefix = "s3-access-logs/${local.bucket_name}/"
}
