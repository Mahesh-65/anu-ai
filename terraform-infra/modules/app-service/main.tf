resource "azurerm_linux_web_app" "main" {
  name                = "${var.prefix}-app-${var.service_name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = var.service_plan_id
  https_only          = true

  site_config {
    always_on         = true
    health_check_path = var.health_check_path
    
    application_stack {
      docker_image_name = "${var.docker_image}:${var.docker_image_tag}"
    }
  }

  app_settings = merge(var.app_settings, {
    "DOCKER_REGISTRY_SERVER_URL"          = "https://index.docker.io/v1"
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = var.app_insights_connection_string
  })

  virtual_network_subnet_id = var.vnet_integration_subnet_id

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}
