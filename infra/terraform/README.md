# fast-auth Terraform Infrastructure

Terraform project that deploys the **attester** and **custom-issuer-rotation** AWS Lambda functions along with all supporting resources.

## Resources created

| Resource | Description |
|---|---|
| **KMS keys** (x3) | RSA 2048 `SIGN_VERIFY` keys with aliases `custom-issuer-previous`, `custom-issuer-current`, `custom-issuer-next` |
| **Secrets Manager** | Secret for attester configuration (NEAR keys, contract IDs, etc.) |
| **IAM roles** | Attester role (KMS read-only + Secrets Manager read) and rotation role (KMS full management) |
| **Lambda functions** | `attester` (Node.js 22) and `custom-issuer-rotation` (Python 3.12) |
| **EventBridge rules** | Attester runs every 5 minutes; rotation runs every 90 days |
| **CloudWatch log groups** | Log retention for both Lambdas (30 days) |

## Project structure

```
infra/terraform/
├── main.tf                       # Provider, backend, module invocations
├── variables.tf                  # All input variables
├── outputs.tf                    # Proxied outputs from the modules
├── terraform.tfvars.example      # Example variable values
├── .gitignore
├── README.md
└── modules/
    ├── kms-signing-keys/         # Shared KMS keys and aliases
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── attester/                 # Attester Lambda and supporting resources
    │   ├── lambda.tf
    │   ├── iam.tf
    │   ├── secrets.tf
    │   ├── eventbridge.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── custom-issuer-rotation/   # Rotation Lambda and supporting resources
        ├── lambda.tf
        ├── iam.tf
        ├── eventbridge.tf
        ├── variables.tf
        └── outputs.tf
```

## Prerequisites

- Terraform >= 1.5
- AWS CLI configured with appropriate credentials
- An S3 bucket for the Terraform state backend
- Lambda zip files built before running `terraform apply`:

```bash
# Attester (Node.js)
cd apps/attester
pnpm install && pnpm build:lambda
# Produces: apps/attester/attester-lambda.zip

# Custom Issuer Rotation (Python)
cd apps/custom-issuer-rotation
zip custom-issuer-rotation-lambda.zip lambda.py
# Produces: apps/custom-issuer-rotation/custom-issuer-rotation-lambda.zip
```

## Deployment

### 1. Initialize Terraform

```bash
cd infra/terraform

terraform init \
  -backend-config="bucket=YOUR_STATE_BUCKET" \
  -backend-config="key=fast-auth/terraform.tfstate" \
  -backend-config="region=us-east-1"
```

### 2. Create a tfvars file

Copy the example and fill in your values:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` — at minimum set `environment`. Sensitive values like `attester_secret_config` should be passed via CLI or a separate file:

```bash
terraform apply -var-file="terraform.tfvars" -var-file="secrets.tfvars"
```

### 3. Plan and apply

```bash
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

## Updating Lambda code

After code changes, rebuild the zip and update:

```bash
# Rebuild
cd apps/attester && pnpm build:lambda
# or
cd apps/custom-issuer-rotation && pnpm build:lambda

# Re-apply (Terraform detects the changed zip hash)
cd infra/terraform
terraform apply -var-file="terraform.tfvars"
```

## Multiple environments

All resource names include the `environment` variable as a suffix, so staging and production can coexist in the same AWS account. Use separate `.tfvars` files or workspaces:

```bash
terraform workspace new staging
terraform apply -var-file="staging.tfvars"

terraform workspace new production
terraform apply -var-file="production.tfvars"
```

## Outputs

| Output | Description |
|---|---|
| `kms_signing_*_key_id` | Key IDs of the three KMS signing keys |
| `attester_lambda_arn` / `name` | Attester Lambda ARN and function name |
| `rotation_lambda_arn` / `name` | Rotation Lambda ARN and function name |
| `attester_secret_arn` | Secrets Manager secret ARN |
| `*_eventbridge_rule_arn` | EventBridge schedule rule ARNs |
