###############################################################################
# modules/vpc/variables.tf
###############################################################################

variable "name" {
  description = "Name prefix applied to all VPC resources."
  type        = string
}

variable "cidr" {
  description = "The IPv4 CIDR block for the VPC (e.g. '10.0.0.0/16')."
  type        = string
}

variable "azs" {
  description = "List of availability zones to deploy subnets into (must have 3 for HA)."
  type        = list(string)

  validation {
    condition     = length(var.azs) >= 2
    error_message = "At least 2 availability zones are required."
  }
}

variable "project" {
  description = "Project name applied as a tag to all resources."
  type        = string
}

variable "environment" {
  description = "Deployment environment name (e.g. 'dev', 'prod')."
  type        = string
}

variable "cluster_name" {
  description = "EKS cluster name used to tag subnets for the Load Balancer Controller."
  type        = string
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway for all private subnets (cost-saving for dev). Set false for prod HA."
  type        = bool
  default     = false
}
