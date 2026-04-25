###############################################################################
# envs/prod/backend.tf
#
# Remote state backend using S3 + DynamoDB locking.
# Uses a separate state key from dev to prevent cross-environment conflicts.
#
# Bootstrap steps: see envs/dev/backend.tf for the full setup procedure.
# Use the SAME state bucket and DynamoDB table for all environments, but
# different state keys.
###############################################################################

# terraform {
#   backend "s3" {
#     bucket         = "<your-tfstate-bucket-name>"        # Replace with your state bucket name
#     key            = "resume-analyser/prod/terraform.tfstate"
#     region         = "us-east-1"                         # Replace with your AWS region
#     encrypt        = true
#     dynamodb_table = "terraform-state-lock"
#   }
# }
