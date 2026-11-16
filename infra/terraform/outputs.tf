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
