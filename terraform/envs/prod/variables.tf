###############################################################################
# envs/prod/variables.tf
###############################################################################

variable "aws_region" {
  description = "AWS region to deploy resources into."
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the production VPC."
  type        = string
  default     = "10.1.0.0/16"
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "List of CIDRs allowed to reach the EKS public API endpoint. MUST be restricted to VPN/office CIDRs in production."
  type        = list(string)
  # IMPORTANT: Replace with your actual corporate/VPN IP ranges before applying!
  default     = ["10.0.0.0/8"]
}

variable "node_instance_types" {
  description = "EC2 instance types for EKS worker nodes (prod: compute-optimised Graviton)."
  type        = list(string)
  default     = ["m6i.large"]
}

variable "node_min_size" {
  description = "Minimum number of EKS worker nodes."
  type        = number
  default     = 3
}

variable "node_max_size" {
  description = "Maximum number of EKS worker nodes."
  type        = number
  default     = 10
}

variable "node_desired_size" {
  description = "Desired number of EKS worker nodes at launch."
  type        = number
  default     = 3
}

variable "rds_instance_class" {
  description = "RDS instance class (prod: general-purpose Graviton)."
  type        = string
  default     = "db.t4g.medium"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type (prod: memory-optimised)."
  type        = string
  default     = "cache.r7g.large"
}

variable "resume_bucket_suffix" {
  description = "Suffix to ensure S3 bucket name global uniqueness (e.g. your AWS account ID or a random string)."
  type        = string
  # No default — must be set in terraform.tfvars
}
