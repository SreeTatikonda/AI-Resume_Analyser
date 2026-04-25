###############################################################################
# modules/iam/outputs.tf
###############################################################################

output "role_arn" {
  description = "ARN of the IRSA role for the application. Annotate the Kubernetes service account with this ARN."
  value       = aws_iam_role.app.arn
}

output "role_name" {
  description = "Name of the IRSA role."
  value       = aws_iam_role.app.name
}

output "s3_policy_arn" {
  description = "ARN of the IAM policy granting S3 access."
  value       = aws_iam_policy.s3.arn
}

output "bedrock_policy_arn" {
  description = "ARN of the IAM policy granting Bedrock InvokeModel access."
  value       = aws_iam_policy.bedrock.arn
}

output "secrets_policy_arn" {
  description = "ARN of the IAM policy granting Secrets Manager read access."
  value       = aws_iam_policy.secrets.arn
}
