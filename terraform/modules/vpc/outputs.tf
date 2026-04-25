###############################################################################
# modules/vpc/outputs.tf
###############################################################################

output "vpc_id" {
  description = "The ID of the VPC."
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC."
  value       = module.vpc.vpc_cidr_block
}

output "public_subnets" {
  description = "List of IDs of public subnets."
  value       = module.vpc.public_subnets
}

output "private_subnets" {
  description = "List of IDs of private subnets (used for EKS worker nodes)."
  value       = module.vpc.private_subnets
}

output "intra_subnets" {
  description = "List of IDs of intra subnets (no internet access; used for RDS and ElastiCache)."
  value       = module.vpc.intra_subnets
}

output "public_subnet_arns" {
  description = "List of ARNs of public subnets."
  value       = module.vpc.public_subnet_arns
}

output "private_subnet_arns" {
  description = "List of ARNs of private subnets."
  value       = module.vpc.private_subnet_arns
}

output "nat_public_ips" {
  description = "List of public Elastic IPs created for AWS NAT Gateway."
  value       = module.vpc.nat_public_ips
}

output "azs" {
  description = "The list of availability zones used by this VPC."
  value       = module.vpc.azs
}
