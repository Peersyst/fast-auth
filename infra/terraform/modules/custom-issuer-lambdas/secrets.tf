# -------------------------------------------------------
# Secrets Manager — attester configuration
# -------------------------------------------------------

resource "aws_secretsmanager_secret" "attester_config" {
  name        = "attester/config-${var.environment}"
  description = "Attester Lambda configuration for ${var.environment}"

  tags = {
    Environment = var.environment
    Component   = "attester"
  }
}

resource "aws_secretsmanager_secret_version" "attester_config" {
  count         = length(var.attester_secret_config) > 0 ? 1 : 0
  secret_id     = aws_secretsmanager_secret.attester_config.id
  secret_string = jsonencode(var.attester_secret_config)
}
