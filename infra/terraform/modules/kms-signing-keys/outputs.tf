output "signing_previous_key_id" {
  description = "KMS key ID for signing-previous"
  value       = aws_kms_key.signing_previous.key_id
}

output "signing_current_key_id" {
  description = "KMS key ID for signing-current"
  value       = aws_kms_key.signing_current.key_id
}

output "signing_next_key_id" {
  description = "KMS key ID for signing-next"
  value       = aws_kms_key.signing_next.key_id
}

output "signing_previous_alias_name" {
  description = "KMS alias name for signing-previous"
  value       = aws_kms_alias.signing_previous.name
}

output "signing_current_alias_name" {
  description = "KMS alias name for signing-current"
  value       = aws_kms_alias.signing_current.name
}

output "signing_next_alias_name" {
  description = "KMS alias name for signing-next"
  value       = aws_kms_alias.signing_next.name
}
