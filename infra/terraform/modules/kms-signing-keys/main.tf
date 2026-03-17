# -------------------------------------------------------
# KMS signing keys & aliases used by custom-issuer + attester
# -------------------------------------------------------

resource "aws_kms_key" "signing_previous" {
  description              = "fast-auth signing key (previous) - ${var.environment}"
  key_usage                = "SIGN_VERIFY"
  customer_master_key_spec = "RSA_2048"
  deletion_window_in_days  = var.kms_key_deletion_window

  tags = {
    Environment = var.environment
    Component   = "fast-auth"
    Role        = "signing-previous"
  }
}

resource "aws_kms_key" "signing_current" {
  description              = "fast-auth signing key (current) - ${var.environment}"
  key_usage                = "SIGN_VERIFY"
  customer_master_key_spec = "RSA_2048"
  deletion_window_in_days  = var.kms_key_deletion_window

  tags = {
    Environment = var.environment
    Component   = "fast-auth"
    Role        = "signing-current"
  }
}

resource "aws_kms_key" "signing_next" {
  description              = "fast-auth signing key (next) - ${var.environment}"
  key_usage                = "SIGN_VERIFY"
  customer_master_key_spec = "RSA_2048"
  deletion_window_in_days  = var.kms_key_deletion_window

  tags = {
    Environment = var.environment
    Component   = "fast-auth"
    Role        = "signing-next"
  }
}

resource "aws_kms_alias" "signing_previous" {
  name          = "alias/custom-issuer-previous"
  target_key_id = aws_kms_key.signing_previous.key_id
}

resource "aws_kms_alias" "signing_current" {
  name          = "alias/custom-issuer-current"
  target_key_id = aws_kms_key.signing_current.key_id
}

resource "aws_kms_alias" "signing_next" {
  name          = "alias/custom-issuer-next"
  target_key_id = aws_kms_key.signing_next.key_id
}
