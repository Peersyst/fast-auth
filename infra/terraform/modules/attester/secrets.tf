# -------------------------------------------------------
# Secrets Manager — attester configuration
# -------------------------------------------------------

resource "aws_secretsmanager_secret" "config" {
  name        = "fast-auth/${var.environment}/attester-lambda"
  description = "Attester Lambda configuration for ${var.environment}"

  tags = {
    Environment = var.environment
    Component   = "attester"
  }
}

resource "aws_secretsmanager_secret_version" "config" {
  count         = length(var.secret_config) > 0 ? 1 : 0
  secret_id     = aws_secretsmanager_secret.config.id
  secret_string = jsonencode(var.secret_config)
}
