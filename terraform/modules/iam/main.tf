###############################################################################
# modules/iam/main.tf
#
# IRSA role for the AI Resume Analyser application pods.
# Grants:
#   1. S3: GetObject, PutObject, DeleteObject on the resume storage bucket
#   2. Bedrock: InvokeModel (for AI analysis)
#   3. Secrets Manager: GetSecretValue on /resume-analyser/* secrets
#
# Trust policy uses sts:AssumeRoleWithWebIdentity scoped to a specific
# Kubernetes namespace and service account via OIDC conditions.
###############################################################################

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

################################################################################
# Trust Policy (WebIdentity for EKS OIDC)
################################################################################

data "aws_iam_policy_document" "app_assume_role" {
  statement {
    sid     = "AllowEKSOIDCAssumeRole"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    # Scope to specific service account — prevents other pods from assuming this role
    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:sub"
      values   = ["system:serviceaccount:${var.app_namespace}:${var.app_service_account}"]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

################################################################################
# IAM Role
################################################################################

resource "aws_iam_role" "app" {
  name        = "${var.role_name_prefix}-app"
  description = "IRSA role for the AI Resume Analyser application (namespace: ${var.app_namespace}, sa: ${var.app_service_account})."

  assume_role_policy = data.aws_iam_policy_document.app_assume_role.json

  # Prevent accidental deletion of the role while pods depend on it
  lifecycle {
    prevent_destroy = false # Set to true once stable
  }

  tags = local.common_tags
}

################################################################################
# S3 Policy — Read/Write on the resume storage bucket
################################################################################

data "aws_iam_policy_document" "s3" {
  statement {
    sid    = "AllowS3BucketList"
    effect = "Allow"
    actions = [
      "s3:GetBucketLocation",
      "s3:ListBucket",
      "s3:ListBucketVersions",
      "s3:GetBucketVersioning",
    ]
    resources = [var.resume_bucket_arn]
  }

  statement {
    sid    = "AllowS3ObjectReadWrite"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:DeleteObjectVersion",
      "s3:GetObjectTagging",
      "s3:PutObjectTagging",
    ]
    resources = ["${var.resume_bucket_arn}/*"]
  }

  # Allow app to generate pre-signed URLs (requires kms:GenerateDataKey on the bucket KMS key)
  dynamic "statement" {
    for_each = var.resume_bucket_kms_key_arn != null ? [1] : []
    content {
      sid    = "AllowKMSForS3"
      effect = "Allow"
      actions = [
        "kms:GenerateDataKey",
        "kms:Decrypt",
      ]
      resources = [var.resume_bucket_kms_key_arn]
    }
  }
}

resource "aws_iam_policy" "s3" {
  name        = "${var.role_name_prefix}-app-s3"
  description = "Allows the Resume Analyser app to read/write objects in the resume S3 bucket."
  policy      = data.aws_iam_policy_document.s3.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "s3" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.s3.arn
}

################################################################################
# Bedrock Policy — InvokeModel
################################################################################

data "aws_iam_policy_document" "bedrock" {
  statement {
    sid    = "AllowBedrockInvokeModel"
    effect = "Allow"
    actions = [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream",
    ]
    # Restrict to specific model IDs — adjust to match the models your app uses
    resources = [
      "arn:aws:bedrock:${local.region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
      "arn:aws:bedrock:${local.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
      "arn:aws:bedrock:${local.region}::foundation-model/amazon.titan-embed-text-v2:0",
    ]
  }

  statement {
    sid    = "AllowBedrockListFoundationModels"
    effect = "Allow"
    actions = [
      "bedrock:ListFoundationModels",
      "bedrock:GetFoundationModel",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "bedrock" {
  name        = "${var.role_name_prefix}-app-bedrock"
  description = "Allows the Resume Analyser app to invoke Amazon Bedrock foundation models."
  policy      = data.aws_iam_policy_document.bedrock.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "bedrock" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.bedrock.arn
}

################################################################################
# Secrets Manager Policy — GetSecretValue on /resume-analyser/* secrets
################################################################################

data "aws_iam_policy_document" "secrets" {
  statement {
    sid    = "AllowSecretsManagerRead"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
    ]
    resources = [
      "arn:aws:secretsmanager:${local.region}:${local.account_id}:secret:/resume-analyser/*",
    ]
  }

  # Allow decrypting secrets that are encrypted with a custom KMS key
  dynamic "statement" {
    for_each = var.secrets_kms_key_arn != null ? [1] : []
    content {
      sid    = "AllowKMSForSecrets"
      effect = "Allow"
      actions = [
        "kms:Decrypt",
        "kms:DescribeKey",
      ]
      resources = [var.secrets_kms_key_arn]
    }
  }
}

resource "aws_iam_policy" "secrets" {
  name        = "${var.role_name_prefix}-app-secrets"
  description = "Allows the Resume Analyser app to read Secrets Manager secrets under /resume-analyser/*."
  policy      = data.aws_iam_policy_document.secrets.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "secrets" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.secrets.arn
}
