###############################################################################
# modules/redis/outputs.tf
###############################################################################

output "primary_endpoint" {
  description = "Address of the primary endpoint for the Redis replication group."
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Address of the reader endpoint (load-balanced across replicas)."
  value       = aws_elasticache_replication_group.this.reader_endpoint_address
}

output "port" {
  description = "Port on which Redis accepts connections (6379)."
  value       = aws_elasticache_replication_group.this.port
}

output "security_group_id" {
  description = "ID of the security group attached to the ElastiCache Redis cluster."
  value       = module.redis_sg.security_group_id
}

output "replication_group_id" {
  description = "ID of the ElastiCache replication group."
  value       = aws_elasticache_replication_group.this.id
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for Redis at-rest encryption."
  value       = aws_kms_key.redis.arn
}
