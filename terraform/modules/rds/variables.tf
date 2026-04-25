###############################################################################
# modules/rds/variables.tf
###############################################################################

variable "identifier" {
  description = "Unique identifier for the RDS instance and related resources."
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC where the RDS security group will be created."
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the DB subnet group (should be intra/private subnets with no internet access)."
  type        = list(string)
}

variable "eks_node_security_group_id" {
  description = "Security group ID of EKS worker nodes. Port 5432 is opened from this SG."
  type        = string
}

variable "instance_class" {
  description = "RDS instance class (e.g. 'db.t4g.micro', 'db.t4g.medium', 'db.r8g.large')."
  type        = string
  default     = "db.t4g.medium"
}

variable "db_name" {
  description = "Name of the initial PostgreSQL database to create."
  type        = string
  default     = "resume_analyser"
}

variable "db_username" {
  description = "Username for the master DB user. Password is managed by AWS Secrets Manager."
  type        = string
  default     = "dbadmin"
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment for high availability. Recommended true for production."
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Enable deletion protection on the RDS instance. Set true for production to prevent accidental deletion."
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Skip the final snapshot when destroying the RDS instance. Set false for production."
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
