variable "environment" {
  description = "Environment name (e.g. staging, production)"
  type        = string
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
}

variable "zip_path" {
  description = "Path to the attester Lambda zip file"
  type        = string
}

variable "schedule" {
  description = "EventBridge schedule expression for the attester Lambda"
  type        = string
}

variable "timeout" {
  description = "Timeout in seconds for the attester Lambda"
  type        = number
}

variable "memory_size" {
  description = "Memory in MB for the attester Lambda"
  type        = number
}

variable "secret_config" {
  description = "JSON map of attester environment variables stored in Secrets Manager"
  type        = map(string)
  sensitive   = true
  default     = {}
}

variable "kms_previous_alias_name" {
  description = "KMS alias name for the previous signing key"
  type        = string
}

variable "kms_current_alias_name" {
  description = "KMS alias name for the current signing key"
  type        = string
}

variable "kms_next_alias_name" {
  description = "KMS alias name for the next signing key"
  type        = string
}
