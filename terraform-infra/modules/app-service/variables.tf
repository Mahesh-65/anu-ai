variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "tags" { type = map(string) }
variable "name" { type = string }
variable "service_plan_id" { type = string }
variable "docker_image" { type = string }
variable "port" { type = string }
variable "ai_connection_string" { type = string }
variable "app_settings" { 
  type = map(string)
  default = {}
}
variable "vnet_integration_subnet_id" { type = string }
