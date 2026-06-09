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

variable "service_name" {
  description = "Name of the microservice"
  type        = string
}

variable "service_plan_id" {
  description = "The ID of the app service plan"
  type        = string
}

variable "docker_image" {
  description = "Docker image name"
  type        = string
}

variable "docker_image_tag" {
  description = "Docker image tag"
  type        = string
}

variable "app_settings" {
  description = "Environment variables for the app"
  type        = map(string)
  default     = {}
}

variable "health_check_path" {
  description = "Path for health check"
  type        = string
  default     = "/api/health"
}

variable "vnet_integration_subnet_id" {
  description = "Subnet ID for VNet integration"
  type        = string
}

variable "app_insights_connection_string" {
  description = "App Insights connection string"
  type        = string
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
}
