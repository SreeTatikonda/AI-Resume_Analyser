###############################################################################
# modules/s3/variables.tf
###############################################################################

variable "bucket_name" {
  description = "Globally unique name for the S3 bucket. Should include account ID or random suffix to ensure uniqueness."
  type        = string
}

variable "sse_algorithm" {
  description = "Server-side encryption algorithm: 'aws:kms' (CMK) or 'AES256' (SSE-S3)."
  type        = string
  default     = "aws:kms"

  validation {
    condition     = contains(["aws:kms", "AES256"], var.sse_algorithm)
    error_message = "sse_algorithm must be 'aws:kms' or 'AES256'."
  }
}

variable "kms_key_arn" {
  description = "ARN of an existing KMS key to use for SSE-KMS. If null and sse_algorithm is 'aws:kms', a new key is created."
  type        = string
  default     = null
}

variable "force_destroy" {
  description = "Allow Terraform to delete the bucket even if it contains objects. Set false for production."
  type        = bool
  default     = false
}

variable "enable_access_logging" {
  description = "Enable S3 server access logging. Requires logging_target_bucket to be set."
  type        = bool
  default     = false
}

variable "logging_target_bucket" {
  description = "Name of the S3 bucket to receive access logs. Required when enable_access_logging = true."
  type        = string
  default     = null
}

variable "project" {
  description = "Project name applied as a tag to all resources."
  type        = string
}

variable "environment" {
  description = "Deployment environment name (e.g. 'dev', 'prod')."
  type        = string
}
