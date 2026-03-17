# -------------------------------------------------------
# IAM — Shared trust policy
# -------------------------------------------------------

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# -------------------------------------------------------
# IAM — Attester Lambda role
# -------------------------------------------------------

resource "aws_iam_role" "attester" {
  name               = "attester-lambda-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Environment = var.environment
    Component   = "attester"
  }
}

resource "aws_iam_role_policy_attachment" "attester_basic_execution" {
  role       = aws_iam_role.attester.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "attester_kms" {
  statement {
    sid = "AllowKMSGetPublicKey"
    actions = [
      "kms:GetPublicKey",
      "kms:DescribeKey",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "attester_kms" {
  name   = "attester-kms-readonly"
  role   = aws_iam_role.attester.id
  policy = data.aws_iam_policy_document.attester_kms.json
}

data "aws_iam_policy_document" "attester_secrets" {
  statement {
    sid     = "AllowReadSecret"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      "${aws_secretsmanager_secret.attester_config.arn}*",
    ]
  }
}

resource "aws_iam_role_policy" "attester_secrets" {
  name   = "attester-secrets-read"
  role   = aws_iam_role.attester.id
  policy = data.aws_iam_policy_document.attester_secrets.json
}

# -------------------------------------------------------
# IAM — Custom Issuer Rotation Lambda role
# -------------------------------------------------------

resource "aws_iam_role" "rotation" {
  name               = "custom-issuer-rotation-lambda-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Environment = var.environment
    Component   = "custom-issuer-rotation"
  }
}

resource "aws_iam_role_policy_attachment" "rotation_basic_execution" {
  role       = aws_iam_role.rotation.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "rotation_kms" {
  statement {
    sid = "AllowKMSKeyManagement"
    actions = [
      "kms:CreateKey",
      "kms:ListAliases",
      "kms:UpdateAlias",
      "kms:DescribeKey",
    ]
    resources = ["*"]
  }

  statement {
    sid = "AllowKMSAliasManagement"
    actions = [
      "kms:DisableKey",
      "kms:ScheduleKeyDeletion",
    ]
    resources = ["*"]
    condition {
      test     = "ForAnyValue:StringEquals"
      variable = "kms:ResourceAliases"
      values = [
        "alias/custom-issuer-previous",
        "alias/custom-issuer-current",
        "alias/custom-issuer-next",
      ]
    }
  }
}

resource "aws_iam_role_policy" "rotation_kms" {
  name   = "custom-issuer-rotation-kms"
  role   = aws_iam_role.rotation.id
  policy = data.aws_iam_policy_document.rotation_kms.json
}
