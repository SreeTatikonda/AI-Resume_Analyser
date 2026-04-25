###############################################################################
# modules/vpc/main.tf
#
# Wraps terraform-aws-modules/vpc/aws with project conventions.
# Creates a 3-AZ VPC with public, private, and intra (DB/cache) subnets.
###############################################################################

locals {
  # Derive subnet CIDRs automatically from the VPC CIDR using cidrsubnet.
  # Layout (assuming /16 base):
  #   public:  .0/24, .1/24, .2/24
  #   private: .10/24, .11/24, .12/24
  #   intra:   .20/24, .21/24, .22/24  (no route to internet; for RDS/Redis)
  az_count       = length(var.azs)
  public_subnets = [for i in range(local.az_count) : cidrsubnet(var.cidr, 8, i)]
  private_subnets = [for i in range(local.az_count) : cidrsubnet(var.cidr, 8, i + 10)]
  intra_subnets  = [for i in range(local.az_count) : cidrsubnet(var.cidr, 8, i + 20)]

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = var.name
  cidr = var.cidr
  azs  = var.azs

  public_subnets  = local.public_subnets
  private_subnets = local.private_subnets
  intra_subnets   = local.intra_subnets

  # NAT Gateway — one per AZ in prod for HA; single in dev for cost savings
  enable_nat_gateway     = true
  single_nat_gateway     = var.single_nat_gateway
  one_nat_gateway_per_az = !var.single_nat_gateway

  # DNS settings required for EKS and ECS service discovery
  enable_dns_hostnames = true
  enable_dns_support   = true

  # VPC Flow Logs for security / audit
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true
  flow_log_max_aggregation_interval    = 60

  # Subnet tags required by the AWS Load Balancer Controller
  public_subnet_tags = {
    "kubernetes.io/role/elb"                        = "1"
    "kubernetes.io/cluster/${var.cluster_name}"     = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"               = "1"
    "kubernetes.io/cluster/${var.cluster_name}"     = "shared"
  }

  intra_subnet_tags = {
    "subnet-type" = "intra"
  }

  tags = local.common_tags
}
