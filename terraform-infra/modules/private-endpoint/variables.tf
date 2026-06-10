variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "tags" { type = map(string) }
variable "name" { type = string }
variable "subnet_id" { type = string }
variable "resource_id" { type = string }
variable "subresource_names" { type = list(string) }
variable "private_dns_zone_ids" { type = list(string) }
