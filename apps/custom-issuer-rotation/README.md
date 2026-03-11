# custom-issuer-rotation

AWS Lambda that rotates the KMS RSA signing keys used by the fast-auth stack.

## Architecture context

```text
custom-issuer (Go)                          attester (Node.js)
  │                                            │
  │ Signs JWTs via KMS                         │ Reads public keys from KMS
  │ (custom-issuer-current only)               │ (custom-issuer-previous,
  │                                            │  custom-issuer-current,
  │                                            │  custom-issuer-next)
  │                                            │
  ▼                                            ▼
AWS KMS                                  NEAR Attestation Contract
  custom-issuer-previous                   Stores the 3 public keys on-chain
  custom-issuer-current                    (requires attester quorum to update)
  custom-issuer-next                             │
                                                 ▼
                                        NEAR CustomIssuerGuard Contract
                                          Verifies JWTs using the
                                          public keys stored on-chain
```

- **custom-issuer** signs new JWTs using only `alias/custom-issuer-current`.
- **attester** fetches the public keys for all three aliases from KMS and submits them to the NEAR Attestation contract. It does not verify JWTs itself — it keeps the on-chain key set up to date.
- **CustomIssuerGuard** (NEAR contract) verifies JWTs using the public keys stored on-chain by the attester.

## Why three aliases

Three aliases exist so that key rotation never invalidates in-flight JWTs:

| Alias | Role |
|---|---|
| `alias/custom-issuer-previous` | Key from the previous period — JWTs signed with it are still valid on-chain |
| `alias/custom-issuer-current` | Active signing key |
| `alias/custom-issuer-next` | Pre-generated key — already attested on-chain before it becomes current |

Because the attester keeps all three public keys on-chain, JWTs signed with the old `current` key remain verifiable after rotation (it moves to `previous`). And because `next` is already on-chain before rotation day, the new `current` key is known to the guard the moment rotation happens — no transaction needed on rotation day.

## What the Lambda does

```text
Before:  prev=A   curr=B   next=C
After:   prev=B   curr=C   next=NEW   (A disabled, deleted in 7 days)
```

1. Reads the key IDs behind all three aliases.
2. Creates a new RSA 2048 `SIGN_VERIFY` key.
3. Disables the old `previous` key and schedules it for deletion in **7 days** (while it still carries its alias, so IAM can scope via `kms:ResourceAliases`).
4. Rotates aliases forward: `previous ← current ← next ← new key`.

After rotation the attester detects the key change, fetches the new set, and submits an updated attestation to the contract.

## Prerequisites

### One-time KMS alias bootstrap

The three aliases must exist before the first deployment:

```bash
PREV=$(aws kms create-key --key-spec RSA_2048 --key-usage SIGN_VERIFY \
  --query 'KeyMetadata.KeyId' --output text)
CURR=$(aws kms create-key --key-spec RSA_2048 --key-usage SIGN_VERIFY \
  --query 'KeyMetadata.KeyId' --output text)
NEXT=$(aws kms create-key --key-spec RSA_2048 --key-usage SIGN_VERIFY \
  --query 'KeyMetadata.KeyId' --output text)

aws kms create-alias --alias-name alias/custom-issuer-previous --target-key-id "$PREV"
aws kms create-alias --alias-name alias/custom-issuer-current  --target-key-id "$CURR"
aws kms create-alias --alias-name alias/custom-issuer-next     --target-key-id "$NEXT"
```

After bootstrapping, run the attester so it attests the initial key set to the contract before the custom-issuer starts issuing tokens.

## Return value

```json
{
  "previous": "<key-id now behind alias/custom-issuer-previous>",
  "current":  "<key-id now behind alias/custom-issuer-current>",
  "next":     "<new key-id behind alias/custom-issuer-next>",
  "scheduled_for_deletion":  "<key-id that was disabled and scheduled for deletion>"
}
```

## Error handling

Alias rotation is wrapped in a try/except that re-raises on failure, so the Lambda returns a non-200 status and CloudWatch logs the exact error. If rotation fails mid-way the alias state must be inspected and corrected manually before retrying.

Key retirement (disable + schedule deletion) runs **before** alias rotation so the key still carries its alias (allowing IAM to scope via `kms:ResourceAliases`). It is best-effort: a warning is logged on failure but rotation continues normally.

## Deploy

### Requirements

| Requirement | Purpose |
|---|---|
| AWS CLI v2 configured with credentials | Deploy and invoke the Lambda |
| Python 3.12+ | Lambda runtime |
| Three KMS aliases bootstrapped (see [One-time KMS alias bootstrap](#one-time-kms-alias-bootstrap)) | The Lambda expects all three aliases to exist |
| IAM role for the Lambda | Execution role with the permissions listed below |

#### IAM permissions

The Lambda execution role needs the following KMS actions:

```json
[
  {
    "Effect": "Allow",
    "Action": ["kms:DescribeKey", "kms:DisableKey", "kms:ScheduleKeyDeletion"],
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
  },
  {
    "Effect": "Allow",
    "Action": "kms:UpdateAlias",
    "Resource": [
      "arn:aws:kms:<REGION>:<ACCOUNT_ID>:alias/custom-issuer-previous",
      "arn:aws:kms:<REGION>:<ACCOUNT_ID>:alias/custom-issuer-current",
      "arn:aws:kms:<REGION>:<ACCOUNT_ID>:alias/custom-issuer-next",
      "arn:aws:kms:<REGION>:<ACCOUNT_ID>:key/*"
    ]
  },
  {
    "Effect": "Allow",
    "Action": "kms:CreateKey",
    "Resource": "*"
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

### Create the IAM role

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

# 3. Inline the KMS permissions (replace <REGION> and <ACCOUNT_ID>)
aws iam put-role-policy \
  --role-name custom-issuer-rotation-role \
  --policy-name custom-issuer-rotation-kms \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["kms:DescribeKey", "kms:DisableKey", "kms:ScheduleKeyDeletion"],
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
      },
      {
        "Effect": "Allow",
        "Action": "kms:UpdateAlias",
        "Resource": [
          "arn:aws:kms:<REGION>:<ACCOUNT_ID>:alias/custom-issuer-previous",
          "arn:aws:kms:<REGION>:<ACCOUNT_ID>:alias/custom-issuer-current",
          "arn:aws:kms:<REGION>:<ACCOUNT_ID>:alias/custom-issuer-next",
          "arn:aws:kms:<REGION>:<ACCOUNT_ID>:key/*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": "kms:CreateKey",
        "Resource": "*"
      }
    ]
  }'
```

### Create the Lambda

```bash
# 1. Package the code
zip lambda.zip lambda.py

# 2. Create the function (uses $ROLE_ARN from the previous step)
aws lambda create-function \
  --function-name custom-issuer-rotation \
  --runtime python3.12 \
  --handler lambda.lambda_handler \
  --role "$ROLE_ARN" \
  --zip-file fileb://lambda.zip \
  --timeout 30
```

### Update an existing Lambda

```bash
zip lambda.zip lambda.py

aws lambda update-function-code \
  --function-name custom-issuer-rotation \
  --zip-file fileb://lambda.zip
```

### Schedule periodic rotation (optional)

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

### Test manually

```bash
aws lambda invoke \
  --function-name custom-issuer-rotation \
  --payload '{}' \
  /dev/stdout
```
