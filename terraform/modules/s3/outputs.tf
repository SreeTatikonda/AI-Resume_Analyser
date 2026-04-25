###############################################################################
# modules/s3/outputs.tf
###############################################################################

output "bucket_id" {
  description = "Name (ID) of the S3 bucket."
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket."
  value       = aws_s3_bucket.this.arn
}

output "bucket_domain_name" {
  description = "Bucket domain name (for path-style access)."
  value       = aws_s3_bucket.this.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "Regional domain name for the bucket (preferred for AWS SDK clients)."
  value       = aws_s3_bucket.this.bucket_regional_domain_name
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for bucket encryption (null if using AES256)."
  value       = length(aws_kms_key.s3) > 0 ? aws_kms_key.s3[0].arn : var.kms_key_arn
}
