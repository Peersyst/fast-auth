# -------------------------------------------------------
# CloudWatch Log Group
# -------------------------------------------------------

resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/custom-issuer-rotation-${var.environment}"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Component   = "custom-issuer-rotation"
  }
}

# -------------------------------------------------------
# Custom Issuer Rotation Lambda
# -------------------------------------------------------

resource "aws_lambda_function" "this" {
  function_name    = "custom-issuer-rotation-${var.environment}"
  role             = aws_iam_role.this.arn
  handler          = "lambda.lambda_handler"
  runtime          = "python3.12"
  timeout          = var.timeout
  memory_size      = var.memory_size
  filename         = var.zip_path
  source_code_hash = filebase64sha256(var.zip_path)

  depends_on = [
    aws_iam_role_policy_attachment.basic_execution,
    aws_iam_role_policy.kms,
    aws_cloudwatch_log_group.this,
  ]

  tags = {
    Environment = var.environment
    Component   = "custom-issuer-rotation"
  }
}
