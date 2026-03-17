variable "environment" {
  description = "Environment name (e.g. staging, production)"
  type        = string
}

variable "kms_key_deletion_window" {
  description = "Number of days before a KMS key is deleted after being scheduled for deletion"
  type        = number
}
