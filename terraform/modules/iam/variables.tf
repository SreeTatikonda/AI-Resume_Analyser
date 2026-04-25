###############################################################################
# modules/iam/variables.tf
###############################################################################

variable "role_name_prefix" {
  description = "Prefix for IAM role and policy names (e.g. 'resume-analyser-dev')."
  type        = string
}

variable "oidc_provider_arn" {
  description = "ARN of the EKS cluster OIDC provider (from modules/eks outputs)."
  type        = string
}

variable "oidc_provider_url" {
  description = "URL of the EKS cluster OIDC provider without 'https://' prefix (from modules/eks outputs)."
  type        = string
}

variable "app_namespace" {
  description = "Kubernetes namespace where the application's service account resides."
  type        = string
  default     = "resume-analyser"
}

variable "app_service_account" {
  description = "Name of the Kubernetes service account used by the application pods."
  type        = string
  default     = "resume-analyser-api"
}

variable "resume_bucket_arn" {
  description = "ARN of the S3 bucket used to store resume files. The app role will have read/write access."
  type        = string
}

variable "resume_bucket_kms_key_arn" {
  description = "ARN of the KMS key used to encrypt the resume S3 bucket. Required for pre-signed URL generation."
  type        = string
  default     = null
}

variable "secrets_kms_key_arn" {
  description = "ARN of a KMS key used to encrypt Secrets Manager secrets. Allows the app to decrypt them."
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
