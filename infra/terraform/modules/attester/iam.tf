# -------------------------------------------------------
# IAM — Attester Lambda role
# -------------------------------------------------------

data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  name               = "attester-lambda-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  tags = {
    Environment = var.environment
    Component   = "attester"
  }
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "kms" {
  statement {
    sid = "AllowKMSGetPublicKey"
    actions = [
      "kms:GetPublicKey",
      "kms:DescribeKey",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "kms" {
  name   = "attester-kms-readonly"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.kms.json
}

data "aws_iam_policy_document" "secrets" {
  statement {
    sid     = "AllowReadSecret"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      "${aws_secretsmanager_secret.config.arn}*",
    ]
  }
}

resource "aws_iam_role_policy" "secrets" {
  name   = "attester-secrets-read"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.secrets.json
}
