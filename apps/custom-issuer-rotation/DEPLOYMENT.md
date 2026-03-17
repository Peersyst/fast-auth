# Custom Issuer Rotation Lambda Deployment

## Requirements

| Requirement | Purpose |
|---|---|
| AWS CLI v2 configured with credentials | Deploy and invoke the Lambda |
| Python 3.12+ | Lambda runtime |
| Three KMS aliases bootstrapped (see [One-time KMS alias bootstrap](./README.md#one-time-kms-alias-bootstrap)) | The Lambda expects all three aliases to exist |
| IAM role for the Lambda | Execution role with the permissions listed below |

## IAM permissions

The Lambda execution role needs the following KMS actions:

```json
[
  {
    "Sid": "AllowKMSKeyManagement",
    "Effect": "Allow",
    "Action": [
      "kms:CreateKey",
      "kms:ListAliases",
      "kms:UpdateAlias",
      "kms:DescribeKey"
    ],
    "Resource": "*"
  },
  {
    "Sid": "AllowKMSAliasManagement",
    "Effect": "Allow",
    "Action": [
      "kms:DisableKey",
      "kms:ScheduleKeyDeletion"
    ],
    "Resource": "*",
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

It also needs CloudWatch Logs permissions so the Lambda can write its logs (rotation status, crash-recovery warnings, errors). The easiest option is to attach the AWS-managed policy `AWSLambdaBasicExecutionRole`, which grants:

```json
{
  "Effect": "Allow",
  "Action": [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents"
  ],
  "Resource": "arn:aws:logs:*:*:*"
}
```

## Create the IAM role

```bash
# 1. Create the execution role
ROLE_ARN=$(aws iam create-role \
  --role-name custom-issuer-rotation-role \
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
  --role-name custom-issuer-rotation-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# 3. Inline the KMS permissions
aws iam put-role-policy \
  --role-name custom-issuer-rotation-role \
  --policy-name custom-issuer-rotation-kms \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowKMSKeyManagement",
        "Effect": "Allow",
        "Action": ["kms:CreateKey", "kms:ListAliases", "kms:UpdateAlias", "kms:DescribeKey"],
        "Resource": "*"
      },
      {
        "Sid": "AllowKMSAliasManagement",
        "Effect": "Allow",
        "Action": ["kms:DisableKey", "kms:ScheduleKeyDeletion"],
        "Resource": "*",
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

## Create the Lambda

```bash
# 1. Package the code
pnpm run build:lambda

# 2. Create the function (uses $ROLE_ARN from the previous step)
aws lambda create-function \
  --function-name custom-issuer-rotation \
  --runtime python3.12 \
  --handler lambda.lambda_handler \
  --role "$ROLE_ARN" \
  --zip-file fileb://lambda.zip \
  --timeout 30
```

## Update an existing Lambda

```bash
zip lambda.zip lambda.py

aws lambda update-function-code \
  --function-name custom-issuer-rotation \
  --zip-file fileb://lambda.zip
```

## Schedule periodic rotation (optional)

Use an EventBridge rule to trigger rotation on a schedule, for example every 30 days:

```bash
aws events put-rule \
  --name custom-issuer-rotation-schedule \
  --schedule-expression "rate(30 days)"

aws lambda add-permission \
  --function-name custom-issuer-rotation \
  --statement-id eventbridge-invoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn "$(aws events describe-rule --name custom-issuer-rotation-schedule --query 'Arn' --output text)"

aws events put-targets \
  --rule custom-issuer-rotation-schedule \
  --targets "Id=1,Arn=$(aws lambda get-function --function-name custom-issuer-rotation --query 'Configuration.FunctionArn' --output text)"
```

## Test manually

```bash
aws lambda invoke \
  --function-name custom-issuer-rotation \
  --payload '{}' \
  /dev/stdout
```