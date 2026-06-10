resource "azurerm_public_ip" "main" {
  name = "app-gw-pip"
  resource_group_name = var.resource_group_name
  location = var.location
  allocation_method = "Static"
  sku = "Standard"
  tags = var.tags
}

locals {
  backend_address_pool_name  = "frontend-be-pool"
  frontend_port_name = "frontend-port"
  frontend_ip_configuration_name = "frontend-ip-config"
  http_setting_name = "frontend-be-htst"
  listener_name = "frontend-listener"
  request_routing_rule_name = "frontend-routing-rule"
  probe_name = "frontend-probe"
}

resource "azurerm_application_gateway" "main" {
  name = var.name
  resource_group_name = var.resource_group_name
  location = var.location
  tags = var.tags

  sku {
    name = "Standard_v2"
    tier = "Standard_v2"
    capacity = 1
  }

  gateway_ip_configuration {
    name = "gateway-ip-config"
    subnet_id = var.subnet_id
  }

  frontend_port {
    name = local.frontend_port_name
    port = 80
  }

  frontend_ip_configuration {
    name = local.frontend_ip_configuration_name
    public_ip_address_id = azurerm_public_ip.main.id
  }

  backend_address_pool {
    name = local.backend_address_pool_name
    fqdns = [var.frontend_fqdn]
  }

  backend_http_settings {
    name = local.http_setting_name
    cookie_based_affinity = "Disabled"
    port = 3000
    protocol = "Http"
    request_timeout = 60
    probe_name = local.probe_name
    pick_host_name_from_backend_address = true
  }

  http_listener {
    name = local.listener_name
    frontend_ip_configuration_name = local.frontend_ip_configuration_name
    frontend_port_name = local.frontend_port_name
    protocol = "Http"
  }

  probe {
    name = local.probe_name
    protocol = "Http"
    path = "/health"
    interval = 30
    timeout = 30
    unhealthy_threshold = 3
    pick_host_name_from_backend_http_settings = true
  }

  request_routing_rule {
    name = local.request_routing_rule_name
    rule_type = "Basic"
    http_listener_name = local.listener_name
    backend_address_pool_name = local.backend_address_pool_name
    backend_http_settings_name = local.http_setting_name
    priority = 100
  }
}
