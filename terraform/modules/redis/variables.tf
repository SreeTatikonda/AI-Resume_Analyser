###############################################################################
# modules/redis/variables.tf
###############################################################################

variable "cluster_id" {
  description = "Unique identifier for the ElastiCache replication group (max 40 chars, alphanumeric + hyphens)."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{1,40}$", var.cluster_id))
    error_message = "cluster_id must be 1-40 lowercase alphanumeric characters or hyphens."
  }
}

variable "vpc_id" {
  description = "ID of the VPC where the Redis security group will be created."
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the ElastiCache subnet group (intra/private subnets recommended)."
  type        = list(string)
}

variable "eks_node_security_group_id" {
  description = "Security group ID of EKS worker nodes. Port 6379 is opened from this SG."
  type        = string
}

variable "node_type" {
  description = "ElastiCache node type (e.g. 'cache.t4g.micro', 'cache.r7g.large')."
  type        = string
  default     = "cache.t4g.micro"
}

variable "num_cache_nodes" {
  description = "Total number of cache nodes (primary + replicas). Use 1 for dev (no HA), 2 for prod (1 primary + 1 replica)."
  type        = number
  default     = 1

  validation {
    condition     = var.num_cache_nodes >= 1 && var.num_cache_nodes <= 6
    error_message = "num_cache_nodes must be between 1 and 6."
  }
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ for automatic failover across AZs. Only applicable when num_cache_nodes >= 2."
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
