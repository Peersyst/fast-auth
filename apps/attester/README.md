# attester-lambda

AWS Lambda deployment of the attester service used by the fast-auth stack.

## Architecture context

```text
EventBridge Schedule                        AWS Secrets Manager
  │                                            │
  │ Triggers Lambda twice                      │ Stores attester config
  │ every 5 minutes                            │ (fast-auth/{env}/attester-0,
  │ (replicaIndex: 0 and 1)                    │  fast-auth/{env}/attester-1)
  │                                            │
  ▼                                            ▼
attester (AWS Lambda) ◄────────────────────────┘
  │
  │ Reads public keys from KMS
  │ (custom-issuer-previous,
  │  custom-issuer-current,
  │  custom-issuer-next)
  │
  ▼
NEAR Attestation Contract
  Stores the 3 public keys on-chain
  (requires attester quorum to update)
```

- **attester** runs as an AWS Lambda function, triggered every 5 minutes by an EventBridge schedule. It runs in two concurrent replicas to achieve consensus on the NEAR smart contract.
- **AWS Secrets Manager** securely stores the private keys and NEAR configuration required by each replica.
- **EventBridge** ensures the Lambda is invoked exactly twice per schedule interval, passing `{"replicaIndex": 0}` and `{"replicaIndex": 1}` respectively.

## What the Lambda does

1. Parses the incoming EventBridge payload to determine its replica index (`0` or `1`).
2. Fetches the required configuration (including NEAR private keys) from AWS Secrets Manager dynamically based on the environment and replica index. It caches these secrets in memory for faster subsequent "warm" invocations.
3. Checks AWS KMS for the current set of RSA public keys (`custom-issuer-previous`, `custom-issuer-current`, `custom-issuer-next`).
4. Compares the KMS keys against the keys currently attested on the NEAR smart contract.
5. If the keys differ, signs and submits a transaction to the NEAR contract to update the attested public keys.

## Deploy

### Requirements

| Requirement | Purpose |
|---|---|
| AWS CLI v2 configured with credentials | Deploy and configure AWS resources |
| Docker | Build the container image for the Lambda |
| ECR Repository | Store the built Docker image |
| Two AWS Secrets | Bootstrapped secrets containing the attester config |

#### IAM permissions

The Lambda execution role needs the following permissions to fetch its configuration and read the public keys:

```json
[
  {
    "Effect": "Allow",
    "Action": "secretsmanager:GetSecretValue",
    "Resource": "arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:fast-auth/*/attester-*"
  },
  {
    "Effect": "Allow",
    "Action": "kms:GetPublicKey",
    "Resource": "arn:aws:kms:<REGION>:<ACCOUNT_ID>:key/*",
    "Condition": {
      "ForAnyValue:StringEquals": {
        "kms:ResourceAliases": [
          "alias/custom-issuer-previous",
          "alias/custom-issuer-current",
          "alias/custom-issuer-next"
        ]
      }
    }
  }
]
```

It also needs CloudWatch Logs permissions so the Lambda can write its logs. The easiest option is to attach the AWS-managed policy `AWSLambdaBasicExecutionRole`.

### Setup Infrastructure

#### 1. Create the ECR Repository

```bash
aws ecr create-repository --repository-name fast-auth-attester
```

#### 2. Create the IAM Role

```bash
# 1. Create the execution role
ROLE_ARN=$(aws iam create-role \
  --role-name attester-lambda-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }' \
  --query 'Role.Arn' --output text)

# 2. Attach CloudWatch Logs permissions
aws iam attach-role-policy \
  --role-name attester-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# 3. Inline the Secrets Manager and KMS permissions (replace <REGION> and <ACCOUNT_ID>)
aws iam put-role-policy \
  --role-name attester-lambda-role \
  --policy-name attester-lambda-permissions \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "secretsmanager:GetSecretValue",
        "Resource": "arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:fast-auth/*/attester-*"
      },
      {
        "Effect": "Allow",
        "Action": "kms:GetPublicKey",
        "Resource": "arn:aws:kms:<REGION>:<ACCOUNT_ID>:key/*",
        "Condition": {
          "ForAnyValue:StringEquals": {
            "kms:ResourceAliases": [
              "alias/custom-issuer-previous",
              "alias/custom-issuer-current",
              "alias/custom-issuer-next"
            ]
          }
        }
      }
    ]
  }'
```

#### 3. Build and Push the Docker Image

```bash
# Replace with your AWS Account ID and Region
ACCOUNT_ID="123456789012"
REGION="us-east-1"
ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/fast-auth-attester"

# Authenticate Docker to ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build the images
docker build -t base -f docker/base.Dockerfile .
docker build -t attester-lambda -f docker/attester.Dockerfile .

# Tag and push
docker tag attester-lambda:latest $ECR_URI:latest
docker push $ECR_URI:latest
```

#### 4. Create the Lambda Function

```bash
aws lambda create-function \
  --function-name attester-staging \
  --package-type Image \
  --code ImageUri=$ECR_URI:latest \
  --role "$ROLE_ARN" \
  --timeout 120 \
  --environment Variables={ENVIRONMENT=staging}
```

#### 5. Configure EventBridge Schedule

Create the EventBridge rule to trigger the Lambda twice every 5 minutes:

```bash
# 1. Create the rule
aws events put-rule \
  --name attester-schedule \
  --schedule-expression "rate(5 minutes)"

# 2. Grant EventBridge permission to invoke the Lambda
aws lambda add-permission \
  --function-name attester-staging \
  --statement-id eventbridge-invoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn "$(aws events describe-rule --name attester-schedule --query 'Arn' --output text)"

# 3. Add the Lambda as a target twice with different payloads
LAMBDA_ARN=$(aws lambda get-function --function-name attester-staging --query 'Configuration.FunctionArn' --output text)

aws events put-targets \
  --rule attester-schedule \
  --targets "[
    {
      \"Id\": \"attester-replica-0\",
      \"Arn\": \"$LAMBDA_ARN\",
      \"Input\": \"{\\\"replicaIndex\\\": 0}\"
    },
    {
      \"Id\": \"attester-replica-1\",
      \"Arn\": \"$LAMBDA_ARN\",
      \"Input\": \"{\\\"replicaIndex\\\": 1}\"
    }
  ]"
```

### CI/CD Deployment

Once the initial infrastructure is set up, subsequent deployments can be handled via CI/CD by simply building the new Docker image, pushing it to ECR, and running:

```bash
aws lambda update-function-code \
  --function-name attester-staging \
  --image-uri <ECR_URI>:<NEW_TAG>
```
