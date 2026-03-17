# Attester Lambda Deployment

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 22.x
- pnpm installed
- esbuild (included as a dev dependency)

## 1. Build the Lambda bundle

```bash
cd apps/attester
pnpm install
pnpm build:lambda
```

This compiles TypeScript, bundles with esbuild (excluding `@aws-sdk/client-kms` which is provided by the Lambda runtime), and produces `attester-lambda.zip`.

## 2. Store environment variables in Secrets Manager

Create a secret containing the attester configuration:

```bash
aws secretsmanager create-secret \
  --name attester/config \
  --secret-string '{
    "PRIVATE_KEY": "ed25519:xxxx",
    "ACCOUNT_ID": "xxxx.near",
    "NODE_URL": "https://xxx.com",
    "CONTRACT_ID": "google-public-keys.testnet",
    "GUARD_CONTRACT_ID": "firebase.jwt.testnet",
    "KEY_PROVIDER": "kms",
    "AWS_REGION": "us-east-1",
    "KMS_PREVIOUS_KEY_ID": "alias/attester-previous",
    "KMS_CURRENT_KEY_ID": "alias/attester-current",
    "KMS_NEXT_KEY_ID": "alias/attester-next"
  }'
```

To update an existing secret:

```bash
aws secretsmanager put-secret-value \
  --secret-id attester/config \
  --secret-string '{ ... }'
```

## 3. Create the IAM role

### 3.1 Trust policy

Save as `trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Create the role:

```bash
aws iam create-role \
  --role-name attester-lambda-role \
  --assume-role-policy-document file://trust-policy.json
```

### 3.2 Attach basic Lambda execution policy

```bash
aws iam attach-role-policy \
  --role-name attester-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### 3.3 KMS read-only policy

Save as `kms-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowKMSGetPublicKey",
      "Effect": "Allow",
      "Action": [
        "kms:GetPublicKey",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    }
  ]
}
```

```bash
aws iam put-role-policy \
  --role-name attester-lambda-role \
  --policy-name attester-kms-readonly \
  --policy-document file://kms-policy.json
```

### 3.4 Secrets Manager read policy

Save as `secrets-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowReadSecret",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:attester/config-*"
    }
  ]
}
```

```bash
aws iam put-role-policy \
  --role-name attester-lambda-role \
  --policy-name attester-secrets-read \
  --policy-document file://secrets-policy.json
```

## 4. Create the Lambda function

```bash
aws lambda create-function \
  --function-name attester \
  --runtime nodejs22.x \
  --role arn:aws:iam::ACCOUNT_ID:role/attester-lambda-role \
  --handler index.handler \
  --zip-file fileb://attester-lambda.zip \
  --timeout 60 \
  --memory-size 256
```

### Load secrets into Lambda environment

The Lambda needs its environment variables populated from the secret. Use the AWS Secrets Manager Lambda extension to inject them at runtime, or load them at deploy time:

```bash
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id attester/config \
  --query SecretString \
  --output text)

aws lambda update-function-configuration \
  --function-name attester \
  --environment "Variables={$(echo "$SECRET" | jq -r 'to_entries | map("\(.key)=\(.value)") | join(",")')}"
```

> This pulls the secret values and sets them as Lambda environment variables. Lambda encrypts environment variables at rest using AWS-managed keys by default. For rotation, re-run this command after updating the secret.

## 5. Schedule with EventBridge (optional)

To run the attester periodically (e.g. every 5 minutes):

```bash
aws events put-rule \
  --name attester-schedule \
  --schedule-expression "rate(5 minutes)"

aws lambda add-permission \
  --function-name attester \
  --statement-id eventbridge-invoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:REGION:ACCOUNT_ID:rule/attester-schedule

aws events put-targets \
  --rule attester-schedule \
  --targets "Id"="1","Arn"="arn:aws:lambda:REGION:ACCOUNT_ID:function:attester"
```

## 6. Update the Lambda

After code changes:

```bash
cd apps/attester
pnpm build:lambda

aws lambda update-function-code \
  --function-name attester \
  --zip-file fileb://attester-lambda.zip
```

## 7. Test the Lambda

Invoke manually:

```bash
aws lambda invoke \
  --function-name attester \
  --log-type Tail \
  output.json

# View logs
cat output.json
```

Check CloudWatch logs:

```bash
aws logs tail /aws/lambda/attester --follow
```