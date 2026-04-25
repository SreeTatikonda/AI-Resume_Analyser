###############################################################################
# modules/eks/variables.tf
###############################################################################

variable "cluster_name" {
  description = "Name of the EKS cluster."
  type        = string
}

variable "k8s_version" {
  description = "Kubernetes version to run on the EKS cluster (e.g. '1.30')."
  type        = string
  default     = "1.30"
}

variable "vpc_id" {
  description = "ID of the VPC in which to create the EKS cluster."
  type        = string
}

variable "subnet_ids" {
  description = "List of private subnet IDs for EKS worker nodes and the cluster API endpoint."
  type        = list(string)
}

variable "node_instance_types" {
  description = "Ordered list of EC2 instance types for the managed node group."
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_min_size" {
  description = "Minimum number of worker nodes in the managed node group."
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum number of worker nodes in the managed node group."
  type        = number
  default     = 5
}

variable "node_desired_size" {
  description = "Desired number of worker nodes in the managed node group."
  type        = number
  default     = 2
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "List of CIDR blocks allowed to access the EKS public API endpoint. Defaults to all (0.0.0.0/0) — restrict to corporate/VPN CIDRs in production."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# ALB Controller settings
variable "alb_controller_namespace" {
  description = "Kubernetes namespace where the AWS Load Balancer Controller service account resides."
  type        = string
  default     = "kube-system"
}

variable "alb_controller_service_account" {
  description = "Name of the Kubernetes service account used by the AWS Load Balancer Controller."
  type        = string
  default     = "aws-load-balancer-controller"
}

# External Secrets Operator settings
variable "eso_namespace" {
  description = "Kubernetes namespace where the External Secrets Operator service account resides."
  type        = string
  default     = "external-secrets"
}

variable "eso_service_account" {
  description = "Name of the Kubernetes service account used by the External Secrets Operator."
  type        = string
  default     = "external-secrets"
}

variable "project" {
  description = "Project name applied as a tag to all resources."
  type        = string
}

variable "environment" {
  description = "Deployment environment name (e.g. 'dev', 'prod')."
  type        = string
}
