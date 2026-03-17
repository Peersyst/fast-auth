variable "environment" {
  description = "Environment name (e.g. staging, production)"
  type        = string
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
}

# --- Attester ---

variable "attester_zip_path" {
  description = "Path to the attester Lambda zip file"
  type        = string
}

variable "attester_schedule" {
  description = "EventBridge schedule expression for the attester Lambda"
  type        = string
}

variable "attester_timeout" {
  description = "Timeout in seconds for the attester Lambda"
  type        = number
}

variable "attester_memory_size" {
  description = "Memory in MB for the attester Lambda"
  type        = number
}

variable "attester_secret_config" {
  description = "JSON map of attester environment variables stored in Secrets Manager"
  type        = map(string)
  sensitive   = true
  default     = {}
}

# --- Custom Issuer Rotation ---

variable "rotation_zip_path" {
  description = "Path to the custom-issuer-rotation Lambda zip file"
  type        = string
}

variable "rotation_schedule" {
  description = "EventBridge schedule expression for the rotation Lambda"
  type        = string
}

variable "rotation_timeout" {
  description = "Timeout in seconds for the rotation Lambda"
  type        = number
}

variable "rotation_memory_size" {
  description = "Memory in MB for the rotation Lambda"
  type        = number
}

# --- KMS ---

variable "kms_key_deletion_window" {
  description = "Number of days before a KMS key is deleted after being scheduled for deletion"
  type        = number
}
