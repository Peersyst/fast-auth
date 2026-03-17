# -------------------------------------------------------
# CloudWatch Log Groups
# -------------------------------------------------------

resource "aws_cloudwatch_log_group" "attester" {
  name              = "/aws/lambda/attester-${var.environment}"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Component   = "attester"
  }
}

resource "aws_cloudwatch_log_group" "rotation" {
  name              = "/aws/lambda/custom-issuer-rotation-${var.environment}"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Component   = "custom-issuer-rotation"
  }
}

# -------------------------------------------------------
# Attester Lambda
# -------------------------------------------------------

resource "aws_lambda_function" "attester" {
  function_name = "attester-${var.environment}"
  role          = aws_iam_role.attester.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  timeout       = var.attester_timeout
  memory_size   = var.attester_memory_size
  filename      = var.attester_zip_path

  environment {
    variables = {
      KEY_PROVIDER        = "kms"
      KMS_REGION          = var.aws_region
      KMS_PREVIOUS_KEY_ID = aws_kms_alias.signing_previous.name
      KMS_CURRENT_KEY_ID  = aws_kms_alias.signing_current.name
      KMS_NEXT_KEY_ID     = aws_kms_alias.signing_next.name
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.attester_basic_execution,
    aws_iam_role_policy.attester_kms,
    aws_iam_role_policy.attester_secrets,
    aws_cloudwatch_log_group.attester,
  ]

  tags = {
    Environment = var.environment
    Component   = "attester"
  }
}

# -------------------------------------------------------
# Custom Issuer Rotation Lambda
# -------------------------------------------------------

resource "aws_lambda_function" "rotation" {
  function_name = "custom-issuer-rotation-${var.environment}"
  role          = aws_iam_role.rotation.arn
  handler       = "lambda.lambda_handler"
  runtime       = "python3.12"
  timeout       = var.rotation_timeout
  memory_size   = var.rotation_memory_size
  filename      = var.rotation_zip_path

  depends_on = [
    aws_iam_role_policy_attachment.rotation_basic_execution,
    aws_iam_role_policy.rotation_kms,
    aws_cloudwatch_log_group.rotation,
  ]

  tags = {
    Environment = var.environment
    Component   = "custom-issuer-rotation"
  }
}
