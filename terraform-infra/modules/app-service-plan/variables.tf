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

variable "sku_name" {
  description = "The SKU name for the service plan"
  type        = string
  default     = "P1v2"
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
}
