# -------------------------------------------------------
# IAM — Custom Issuer Rotation Lambda role
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
  name               = "custom-issuer-rotation-lambda-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  tags = {
    Environment = var.environment
    Component   = "custom-issuer-rotation"
  }
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "kms" {
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
      values   = var.kms_alias_names
    }
  }
}

resource "aws_iam_role_policy" "kms" {
  name   = "custom-issuer-rotation-kms"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.kms.json
}
