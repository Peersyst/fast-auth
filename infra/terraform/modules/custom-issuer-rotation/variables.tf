variable "environment" {
  description = "Environment name (e.g. staging, production)"
  type        = string
}

variable "zip_path" {
  description = "Path to the custom-issuer-rotation Lambda zip file"
  type        = string
}

variable "schedule" {
  description = "EventBridge schedule expression for the rotation Lambda"
  type        = string
}

variable "timeout" {
  description = "Timeout in seconds for the rotation Lambda"
  type        = number
}

variable "memory_size" {
  description = "Memory in MB for the rotation Lambda"
  type        = number
}

variable "kms_alias_names" {
  description = "List of KMS alias names used for IAM condition on key retirement"
  type        = list(string)
}
