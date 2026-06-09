variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "location" {
  description = "The Azure region"
  type        = string
}

variable "prefix" {
  description = "Prefix for resources"
  type        = string
}

variable "subnet_id" {
  description = "The ID of the subnet for the application gateway"
  type        = string
}

variable "frontend_fqdn" {
  description = "The FQDN of the frontend app service"
  type        = string
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
}
