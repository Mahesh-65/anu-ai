variable "environment" {
  description = "Execution environment (dev, qa, uat, prod)"
  type        = string
}

variable "location" {
  description = "Azure region for deployment"
  type        = string
  default     = "southindia"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "OrganiStation"
}

variable "tenant_id" {
  description = "Azure Tenant ID"
  type        = string
}

variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
}

variable "jwt_secret" {
  description = "JWT Secret for Auth service"
  type        = string
  sensitive   = true
}

variable "internal_service_secret" {
  description = "Secret for internal microservice communication"
  type        = string
  sensitive   = true
}

variable "groq_api_key" {
  description = "Groq API Key for AI service"
  type        = string
  sensitive   = true
  default     = ""
}

variable "allowed_ip" {
  description = "The public IP of the machine running Terraform"
  type        = string
  default     = ""
}
