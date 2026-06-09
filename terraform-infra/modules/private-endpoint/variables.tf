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

variable "name" {
  description = "Name suffix for the private endpoint"
  type        = string
}

variable "subnet_id" {
  description = "The ID of the subnet where the private endpoint should be created"
  type        = string
}

variable "resource_id" {
  description = "The ID of the resource to connect via private endpoint"
  type        = string
}

variable "subresource_name" {
  description = "The subresource name (e.g., vault, blob, MongoDB)"
  type        = string
}

variable "private_dns_zone_id" {
  description = "The ID of the private DNS zone for resolution"
  type        = string
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
}
