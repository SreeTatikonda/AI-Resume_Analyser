###############################################################################
# modules/rds/outputs.tf
###############################################################################

output "endpoint" {
  description = "Connection endpoint for the RDS instance (hostname:port)."
  value       = module.rds.db_instance_endpoint
}

output "address" {
  description = "Hostname of the RDS instance (without port)."
  value       = module.rds.db_instance_address
}

output "port" {
  description = "Port on which the RDS instance accepts connections."
  value       = module.rds.db_instance_port
}

output "db_name" {
  description = "Name of the PostgreSQL database."
  value       = module.rds.db_instance_name
}

output "username" {
  description = "Master username for the RDS instance."
  value       = module.rds.db_instance_username
  sensitive   = true
}

output "security_group_id" {
  description = "ID of the security group attached to the RDS instance."
  value       = module.rds_sg.security_group_id
}

output "master_user_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the master user password (AWS-managed rotation)."
  value       = module.rds.db_instance_master_user_secret_arn
}

output "kms_key_arn" {
  description = "ARN of the KMS key used to encrypt the RDS instance storage."
  value       = aws_kms_key.rds.arn
}

output "instance_identifier" {
  description = "Identifier of the RDS instance."
  value       = module.rds.db_instance_identifier
}
