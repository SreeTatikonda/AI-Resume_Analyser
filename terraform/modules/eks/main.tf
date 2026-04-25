###############################################################################
# modules/eks/main.tf
#
# Wraps terraform-aws-modules/eks/aws v20+.
# Creates:
#   - EKS control plane with managed node group
#   - Cluster add-ons (vpc-cni, coredns, kube-proxy, aws-ebs-csi-driver)
#   - IRSA roles for AWS Load Balancer Controller, External Secrets Operator,
#     and the application itself
###############################################################################

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

################################################################################
# EKS Cluster
################################################################################

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.11"

  cluster_name    = var.cluster_name
  cluster_version = var.k8s_version

  vpc_id     = var.vpc_id
  subnet_ids = var.subnet_ids

  # ------------------------------------------------------------------
  # Endpoint access
  # NOTE: cluster_endpoint_public_access is enabled for initial setup.
  # For production hardening, restrict cluster_endpoint_public_access_cidrs
  # to your corporate/VPN IP ranges and consider disabling public access
  # once private connectivity (VPN/Direct Connect) is established.
  # ------------------------------------------------------------------
  cluster_endpoint_public_access       = true
  cluster_endpoint_public_access_cidrs = var.cluster_endpoint_public_access_cidrs
  cluster_endpoint_private_access      = true

  # Control-plane logging (stored in CloudWatch Logs for 90 days)
  cluster_enabled_log_types = ["audit", "api", "authenticator"]

  # Allow EKS to manage ENIs in the VPC
  cluster_ip_family = "ipv4"

  # Automatically add creator's IAM identity to cluster auth
  enable_cluster_creator_admin_permissions = true

  # Cluster add-ons managed by EKS
  cluster_addons = {
    vpc-cni = {
      most_recent = true
      configuration_values = jsonencode({
        env = {
          # Enable prefix delegation for higher pod density
          ENABLE_PREFIX_DELEGATION = "true"
          WARM_PREFIX_TARGET       = "1"
        }
      })
    }
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = aws_iam_role.ebs_csi.arn
    }
  }

  # Managed node group defaults
  eks_managed_node_group_defaults = {
    ami_type       = "AL2_x86_64"
    instance_types = var.node_instance_types

    iam_role_additional_policies = {
      AmazonSSMManagedInstanceCore = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
    }

    # Use latest EKS-optimised AMI
    use_latest_ami_release_version = true

    # Root volume configuration
    block_device_mappings = {
      xvda = {
        device_name = "/dev/xvda"
        ebs = {
          volume_size           = 50
          volume_type           = "gp3"
          iops                  = 3000
          throughput            = 125
          encrypted             = true
          delete_on_termination = true
        }
      }
    }

    tags = local.common_tags
  }

  eks_managed_node_groups = {
    main = {
      name            = "${var.cluster_name}-main"
      use_name_prefix = false

      subnet_ids = var.subnet_ids

      min_size     = var.node_min_size
      max_size     = var.node_max_size
      desired_size = var.node_desired_size

      labels = {
        role = "application"
      }

      taints = []

      update_config = {
        max_unavailable_percentage = 33
      }
    }
  }

  tags = local.common_tags
}

################################################################################
# EBS CSI Driver IRSA
# Required for the aws-ebs-csi-driver addon to provision PersistentVolumes.
################################################################################

resource "aws_iam_role" "ebs_csi" {
  name        = "${var.cluster_name}-ebs-csi-driver"
  description = "IRSA role for the EBS CSI driver addon."

  assume_role_policy = data.aws_iam_policy_document.ebs_csi_assume.json

  tags = local.common_tags
}

data "aws_iam_policy_document" "ebs_csi_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${module.eks.oidc_provider}:sub"
      values   = ["system:serviceaccount:kube-system:ebs-csi-controller-sa"]
    }

    condition {
      test     = "StringEquals"
      variable = "${module.eks.oidc_provider}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "ebs_csi" {
  role       = aws_iam_role.ebs_csi.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

################################################################################
# AWS Load Balancer Controller IRSA
#
# The ALB Controller itself is installed via Helm (post-apply step).
# This creates only the IAM policy + role needed by its service account.
################################################################################

# Download the official IAM policy document recommended by AWS
data "aws_iam_policy_document" "alb_controller" {
  # Grants the ALB controller the minimum required permissions to manage
  # Application Load Balancers, Target Groups, Security Groups, and WAFv2.
  # Policy based on:
  # https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json

  statement {
    sid    = "AllowLoadBalancerActions"
    effect = "Allow"
    actions = [
      "elasticloadbalancing:*",
      "ec2:CreateSecurityGroup",
      "ec2:DeleteSecurityGroup",
      "ec2:AuthorizeSecurityGroupIngress",
      "ec2:AuthorizeSecurityGroupEgress",
      "ec2:RevokeSecurityGroupIngress",
      "ec2:RevokeSecurityGroupEgress",
      "ec2:DescribeInstances",
      "ec2:DescribeInstanceStatus",
      "ec2:DescribeNetworkInterfaces",
      "ec2:DescribeSecurityGroups",
      "ec2:DescribeSubnets",
      "ec2:DescribeTags",
      "ec2:DescribeVpcs",
      "ec2:DescribeAvailabilityZones",
      "ec2:DescribeInternetGateways",
      "ec2:DescribeCoipPools",
      "ec2:GetCoipPoolUsage",
      "ec2:CreateTags",
      "ec2:DeleteTags",
      "cognito-idp:DescribeUserPoolClient",
      "acm:ListCertificates",
      "acm:DescribeCertificate",
      "iam:CreateServiceLinkedRole",
      "iam:GetServerCertificate",
      "iam:ListServerCertificates",
      "waf-regional:GetWebACL",
      "waf-regional:GetWebACLForResource",
      "waf-regional:AssociateWebACL",
      "waf-regional:DisassociateWebACL",
      "wafv2:GetWebACL",
      "wafv2:GetWebACLForResource",
      "wafv2:AssociateWebACL",
      "wafv2:DisassociateWebACL",
      "shield:GetSubscriptionState",
      "shield:DescribeProtection",
      "shield:CreateProtection",
      "shield:DeleteProtection",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "alb_controller" {
  name        = "${var.cluster_name}-alb-controller"
  description = "IAM policy for the AWS Load Balancer Controller running on EKS cluster ${var.cluster_name}."
  policy      = data.aws_iam_policy_document.alb_controller.json

  tags = local.common_tags
}

resource "aws_iam_role" "alb_controller" {
  name        = "${var.cluster_name}-alb-controller"
  description = "IRSA role assumed by the ALB Controller service account in namespace ${var.alb_controller_namespace}."

  assume_role_policy = data.aws_iam_policy_document.alb_controller_assume.json

  tags = local.common_tags
}

data "aws_iam_policy_document" "alb_controller_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${module.eks.oidc_provider}:sub"
      values   = ["system:serviceaccount:${var.alb_controller_namespace}:${var.alb_controller_service_account}"]
    }

    condition {
      test     = "StringEquals"
      variable = "${module.eks.oidc_provider}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "alb_controller" {
  role       = aws_iam_role.alb_controller.name
  policy_arn = aws_iam_policy.alb_controller.arn
}

################################################################################
# External Secrets Operator IRSA
#
# ESO is installed via Helm (post-apply step).
# This role allows the ESO service account to read Secrets Manager secrets.
################################################################################

data "aws_iam_policy_document" "eso" {
  statement {
    sid    = "AllowSecretsManagerRead"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
      "secretsmanager:ListSecretVersionIds",
    ]
    resources = [
      "arn:aws:secretsmanager:${local.region}:${local.account_id}:secret:/resume-analyser/*",
    ]
  }

  statement {
    sid    = "AllowSSMRead"
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]
    resources = [
      "arn:aws:ssm:${local.region}:${local.account_id}:parameter/resume-analyser/*",
    ]
  }
}

resource "aws_iam_policy" "eso" {
  name        = "${var.cluster_name}-external-secrets-operator"
  description = "IAM policy for the External Secrets Operator on EKS cluster ${var.cluster_name}."
  policy      = data.aws_iam_policy_document.eso.json

  tags = local.common_tags
}

resource "aws_iam_role" "eso" {
  name        = "${var.cluster_name}-external-secrets-operator"
  description = "IRSA role assumed by the ESO service account in namespace ${var.eso_namespace}."

  assume_role_policy = data.aws_iam_policy_document.eso_assume.json

  tags = local.common_tags
}

data "aws_iam_policy_document" "eso_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${module.eks.oidc_provider}:sub"
      values   = ["system:serviceaccount:${var.eso_namespace}:${var.eso_service_account}"]
    }

    condition {
      test     = "StringEquals"
      variable = "${module.eks.oidc_provider}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "eso" {
  role       = aws_iam_role.eso.name
  policy_arn = aws_iam_policy.eso.arn
}
