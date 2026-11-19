output "console_secret_name" {
  value       = module.console_secret.secret_name
  description = "Secret holding the console API configuration. Use it as objectName in the chart's values."
}

output "console_secret_arn" {
  value       = module.console_secret.secret_arn
  description = "ARN of the console secret."
}

output "console_db_address" {
  value       = try(module.console_db[0].db_instance_address, null)
  description = "Hostname of the console database. Null in staging, which reuses the shared instance. Store it in the console secret as DB_HOST."
}

output "console_db_port" {
  value       = try(module.console_db[0].db_instance_port, null)
  description = "Port of the console database. Null in staging."
}

output "console_db_master_user_secret_arn" {
  value       = try(module.console_db[0].master_user_secret_arn, null)
  description = "AWS-managed secret holding the database master password. Null in staging."
}

output "console_certificate_arn" {
  value       = try(module.console_certificate[0].certificate_arn, null)
  description = "Certificate for console.auth.near.org. Add it to ingress.certificate in the chart's production values. Null in staging."
}

output "sandbox_broker_certificate_arn" {
  value       = try(module.sandbox_broker_certificate[0].certificate_arn, null)
  description = "Certificate for sandbox.auth.near.org. Add it to ingress.certificate in the chart's staging values. Null in production."
}
