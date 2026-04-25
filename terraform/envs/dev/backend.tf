###############################################################################
# envs/dev/backend.tf
#
# Remote state backend using S3 + DynamoDB locking.
#
# Bootstrap steps (run ONCE before terraform init):
#
#   1. Create the state bucket:
#      aws s3api create-bucket \
#        --bucket <your-tfstate-bucket-name> \
#        --region <aws-region> \
#        --create-bucket-configuration LocationConstraint=<aws-region>
#
#   2. Enable versioning on the state bucket:
#      aws s3api put-bucket-versioning \
#        --bucket <your-tfstate-bucket-name> \
#        --versioning-configuration Status=Enabled
#
#   3. Enable server-side encryption:
#      aws s3api put-bucket-encryption \
#        --bucket <your-tfstate-bucket-name> \
#        --server-side-encryption-configuration \
#          '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
#
#   4. Block public access:
#      aws s3api put-public-access-block \
#        --bucket <your-tfstate-bucket-name> \
#        --public-access-block-configuration \
#          "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
#
#   5. Create the DynamoDB lock table:
#      aws dynamodb create-table \
#        --table-name terraform-state-lock \
#        --attribute-definitions AttributeName=LockID,AttributeType=S \
#        --key-schema AttributeName=LockID,KeyType=HASH \
#        --billing-mode PAY_PER_REQUEST \
#        --region <aws-region>
#
# After bootstrapping, uncomment the backend block below and run:
#   terraform init -migrate-state
###############################################################################

# terraform {
#   backend "s3" {
#     bucket         = "<your-tfstate-bucket-name>"        # Replace with your state bucket name
#     key            = "resume-analyser/dev/terraform.tfstate"
#     region         = "us-east-1"                         # Replace with your AWS region
#     encrypt        = true
#     dynamodb_table = "terraform-state-lock"
#   }
# }
