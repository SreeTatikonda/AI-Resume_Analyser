###############################################################################
# modules/ecr/outputs.tf
###############################################################################

output "repo_urls" {
  description = "Map of repository short name to its full ECR URL (e.g. { api = '123456789012.dkr.ecr.us-east-1.amazonaws.com/resume-analyser/api' })."
  value       = { for k, v in aws_ecr_repository.this : k => v.repository_url }
}

output "repo_arns" {
  description = "Map of repository short name to its ARN."
  value       = { for k, v in aws_ecr_repository.this : k => v.arn }
}

output "registry_id" {
  description = "AWS account ID (registry ID) for the ECR registry."
  value       = values(aws_ecr_repository.this)[0].registry_id
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for ECR encryption (null if using AES256)."
  value       = length(aws_kms_key.ecr) > 0 ? aws_kms_key.ecr[0].arn : null
}
