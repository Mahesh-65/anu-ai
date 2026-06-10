variable "project_name" {
  type        = string
  default     = "organistation5903"
}

variable "environment" {
  type        = string
}

variable "location" {
  type        = string
  default     = "Australia East"
}

variable "jwt_secret" {
  type        = string
  sensitive   = true
}

variable "tags" {
  type = map(string)
  default = {
    Project     = "OrganiStation"
    Owner       = "DevOps"
    CostCenter  = "Engineering"
  }
}
