variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g. staging, production)"
  type        = string
}

# --- Attester ---

variable "attester_zip_path" {
  description = "Path to the attester Lambda zip file (built via pnpm build:lambda)"
  type        = string
  default     = "../../apps/attester/attester-lambda.zip"
}

variable "attester_schedule" {
  description = "EventBridge schedule expression for the attester Lambda"
  type        = string
  default     = "rate(5 minutes)"
}

variable "attester_timeout" {
  description = "Timeout in seconds for the attester Lambda"
  type        = number
  default     = 60
}

variable "attester_memory_size" {
  description = "Memory in MB for the attester Lambda"
  type        = number
  default     = 256
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
  default     = "../../apps/custom-issuer-rotation/custom-issuer-rotation-lambda.zip"
}

variable "rotation_schedule" {
  description = "EventBridge schedule expression for the rotation Lambda"
  type        = string
  default     = "rate(90 days)"
}

variable "rotation_timeout" {
  description = "Timeout in seconds for the rotation Lambda"
  type        = number
  default     = 30
}

variable "rotation_memory_size" {
  description = "Memory in MB for the rotation Lambda"
  type        = number
  default     = 128
}

# --- KMS ---

variable "kms_key_deletion_window" {
  description = "Number of days before a KMS key is deleted after being scheduled for deletion"
  type        = number
  default     = 7
}
