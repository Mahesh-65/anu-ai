variable "project_name" {
  type        = string
  default     = "organistation5903"
  description = "Base project name; override per environment in tfvars for unique resource naming."
}

variable "environment" {
  type        = string
  description = "Target deployment environment."
}

variable "location" {
  type        = string
  default     = "Australia East"
  description = "Azure region to deploy resources into."
}

variable "jwt_secret" {
  type        = string
  sensitive   = true
  description = "JWT secret passed into each App Service."
}

variable "tags" {
  type = map(string)
  default = {
    Project     = "OrganiStation"
    Owner       = "DevOps"
    CostCenter  = "Engineering"
  }
  description = "Common tags applied to all resources. Environment tag is merged in root configuration."
}
