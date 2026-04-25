###############################################################################
# modules/ecr/variables.tf
###############################################################################

variable "repos" {
  description = "List of repository short names to create (e.g. ['api', 'worker', 'frontend']). Repositories are prefixed with name_prefix."
  type        = list(string)
  default     = ["api", "worker", "frontend"]
}

variable "name_prefix" {
  description = "Prefix applied to all ECR repository names (e.g. 'resume-analyser'). Full name will be '<name_prefix>/<repo>'."
  type        = string
}

variable "image_tag_mutability" {
  description = "Image tag mutability: 'IMMUTABLE' (recommended for prod — prevents tag overwrites) or 'MUTABLE' (convenient for dev)."
  type        = string
  default     = "IMMUTABLE"

  validation {
    condition     = contains(["IMMUTABLE", "MUTABLE"], var.image_tag_mutability)
    error_message = "image_tag_mutability must be 'IMMUTABLE' or 'MUTABLE'."
  }
}

variable "encryption_type" {
  description = "Encryption type for ECR: 'KMS' (customer-managed) or 'AES256' (AWS-managed). KMS is recommended for production."
  type        = string
  default     = "KMS"

  validation {
    condition     = contains(["KMS", "AES256"], var.encryption_type)
    error_message = "encryption_type must be 'KMS' or 'AES256'."
  }
}

variable "force_delete" {
  description = "Allow Terraform to delete repositories that still contain images. Set false for production."
  type        = bool
  default     = false
}

variable "project" {
  description = "Project name applied as a tag to all resources."
  type        = string
}

variable "environment" {
  description = "Deployment environment name (e.g. 'dev', 'prod')."
  type        = string
}
