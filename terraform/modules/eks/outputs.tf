###############################################################################
# modules/eks/outputs.tf
###############################################################################

output "cluster_name" {
  description = "Name of the EKS cluster."
  value       = module.eks.cluster_name
}

output "cluster_id" {
  description = "ID / ARN of the EKS cluster."
  value       = module.eks.cluster_arn
}

output "cluster_endpoint" {
  description = "Endpoint URL for the EKS Kubernetes API server."
  value       = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64-encoded certificate authority data for the EKS cluster."
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "cluster_version" {
  description = "The Kubernetes version running on the cluster."
  value       = module.eks.cluster_version
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC provider associated with the EKS cluster (used for IRSA)."
  value       = module.eks.oidc_provider_arn
}

output "oidc_provider_url" {
  description = "URL of the OIDC provider (without https:// prefix) for use in IAM assume-role conditions."
  value       = module.eks.oidc_provider
}

output "node_group_role_arn" {
  description = "ARN of the IAM role used by the EKS managed node group."
  value       = module.eks.eks_managed_node_groups["main"].iam_role_arn
}

output "cluster_security_group_id" {
  description = "ID of the security group attached to the EKS cluster control plane."
  value       = module.eks.cluster_security_group_id
}

output "node_security_group_id" {
  description = "ID of the security group attached to EKS managed node group instances."
  value       = module.eks.node_security_group_id
}

# IRSA Role ARNs

output "alb_controller_role_arn" {
  description = "ARN of the IRSA role for the AWS Load Balancer Controller."
  value       = aws_iam_role.alb_controller.arn
}

output "eso_role_arn" {
  description = "ARN of the IRSA role for the External Secrets Operator."
  value       = aws_iam_role.eso.arn
}

output "ebs_csi_role_arn" {
  description = "ARN of the IRSA role for the EBS CSI driver addon."
  value       = aws_iam_role.ebs_csi.arn
}
