variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "tags" { type = map(string) }
variable "storage_account_name" { type = string }
variable "create_backend_container" { 
  type = bool 
  default = false
}
