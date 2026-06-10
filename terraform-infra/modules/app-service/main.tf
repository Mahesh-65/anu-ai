resource "azurerm_linux_web_app" "main" {
  name = var.name
  location = var.location
  resource_group_name = var.resource_group_name
  service_plan_id = var.service_plan_id
  https_only = true

  site_config {
    always_on = true
    health_check_path = "/health"
    health_check_eviction_time_in_min = 2
    
    application_stack {
      docker_image_name = var.docker_image
      docker_registry_url = "https://index.docker.io"
    }
  }

  app_settings = merge(var.app_settings, {
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = var.ai_connection_string
    "WEBSITES_PORT" = var.port
  })

  identity {
    type = "SystemAssigned"
  }

  virtual_network_subnet_id = var.vnet_integration_subnet_id

  tags = var.tags
}
