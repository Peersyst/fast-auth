# -------------------------------------------------------
# CloudWatch Log Group
# -------------------------------------------------------

resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/attester-${var.environment}"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Component   = "attester"
  }
}

# -------------------------------------------------------
# Attester Lambda
# -------------------------------------------------------

resource "aws_lambda_function" "this" {
  function_name    = "attester-${var.environment}"
  role             = aws_iam_role.this.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  timeout          = var.timeout
  memory_size      = var.memory_size
  filename         = var.zip_path
  source_code_hash = filebase64sha256(var.zip_path)

  environment {
    variables = merge(
      {
        KEY_PROVIDER        = "kms"
        KMS_REGION          = var.aws_region
        KMS_PREVIOUS_KEY_ID = var.kms_previous_alias_name
        KMS_CURRENT_KEY_ID  = var.kms_current_alias_name
        KMS_NEXT_KEY_ID     = var.kms_next_alias_name
      },
      var.secret_config,
    )
  }

  depends_on = [
    aws_iam_role_policy_attachment.basic_execution,
    aws_iam_role_policy.kms,
    aws_iam_role_policy.secrets,
    aws_cloudwatch_log_group.this,
  ]

  tags = {
    Environment = var.environment
    Component   = "attester"
  }
}
