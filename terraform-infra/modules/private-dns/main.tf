resource "azurerm_private_dns_zone" "web" {
  name = "privatelink.azurewebsites.net"
  resource_group_name = var.resource_group_name
  tags = var.tags
}

resource "azurerm_private_dns_zone" "db" {
  name = "privatelink.documents.azure.com"
  resource_group_name = var.resource_group_name
  tags = var.tags
}

resource "azurerm_private_dns_zone" "storage" {
  name = "privatelink.blob.core.windows.net"
  resource_group_name = var.resource_group_name
  tags = var.tags
}

# VNet Links
resource "azurerm_private_dns_zone_virtual_network_link" "web_gw" {
  name = "web-gw-link"
  resource_group_name = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.web.name
  virtual_network_id = var.app_gw_vnet_id
}
resource "azurerm_private_dns_zone_virtual_network_link" "web_svc" {
  name = "web-svc-link"
  resource_group_name = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.web.name
  virtual_network_id = var.app_svc_vnet_id
}
resource "azurerm_private_dns_zone_virtual_network_link" "web_db" {
  name = "web-db-link"
  resource_group_name = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.web.name
  virtual_network_id = var.db_vnet_id
}

resource "azurerm_private_dns_zone_virtual_network_link" "db_gw" {
  name = "db-gw-link"
  resource_group_name = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.db.name
  virtual_network_id = var.app_gw_vnet_id
}
resource "azurerm_private_dns_zone_virtual_network_link" "db_svc" {
  name = "db-svc-link"
  resource_group_name = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.db.name
  virtual_network_id = var.app_svc_vnet_id
}
resource "azurerm_private_dns_zone_virtual_network_link" "db_db" {
  name = "db-db-link"
  resource_group_name = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.db.name
  virtual_network_id = var.db_vnet_id
}

resource "azurerm_private_dns_zone_virtual_network_link" "st_gw" {
  name = "st-gw-link"
  resource_group_name = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.storage.name
  virtual_network_id = var.app_gw_vnet_id
}
resource "azurerm_private_dns_zone_virtual_network_link" "st_svc" {
  name = "st-svc-link"
  resource_group_name = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.storage.name
  virtual_network_id = var.app_svc_vnet_id
}
resource "azurerm_private_dns_zone_virtual_network_link" "st_db" {
  name = "st-db-link"
  resource_group_name = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.storage.name
  virtual_network_id = var.db_vnet_id
}
