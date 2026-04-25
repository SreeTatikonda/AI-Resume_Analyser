###############################################################################
# envs/dev/variables.tf
###############################################################################

variable "aws_region" {
  description = "AWS region to deploy resources into."
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "List of CIDRs allowed to reach the EKS public API endpoint. Restrict to VPN/office IPs in production."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "node_instance_types" {
  description = "EC2 instance types for EKS worker nodes (dev: small and cheap)."
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_min_size" {
  description = "Minimum number of EKS worker nodes."
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum number of EKS worker nodes."
  type        = number
  default     = 3
}

variable "node_desired_size" {
  description = "Desired number of EKS worker nodes."
  type        = number
  default     = 2
}

variable "rds_instance_class" {
  description = "RDS instance class (dev: cheapest Graviton option)."
  type        = string
  default     = "db.t4g.micro"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type (dev: cheapest Graviton option)."
  type        = string
  default     = "cache.t4g.micro"
}

variable "resume_bucket_suffix" {
  description = "Suffix to ensure S3 bucket name global uniqueness (e.g. your AWS account ID or a random string)."
  type        = string
  # No default — must be set in terraform.tfvars
}
