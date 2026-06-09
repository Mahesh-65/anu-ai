variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "dns_zones" {
  description = "List of private DNS zones to create"
  type        = list(string)
}

variable "dns_vnet_links" {
  description = "Mapping of DNS zones to VNets for linking"
  type = list(object({
    zone_name = string
    vnet_name = string
    vnet_id   = string
  }))
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
}
