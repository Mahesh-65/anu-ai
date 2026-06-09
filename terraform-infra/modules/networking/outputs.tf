output "appgw_vnet_id" {
  value = azurerm_virtual_network.app_gateway.id
}

output "apps_vnet_id" {
  value = azurerm_virtual_network.app_services.id
}

output "db_vnet_id" {
  value = azurerm_virtual_network.database.id
}

output "appgw_subnet_id" {
  value = azurerm_subnet.app_gateway.id
}

output "pe_apps_subnet_id" {
  value = azurerm_subnet.private_endpoint_apps.id
}

output "vnet_integration_subnet_id" {
  value = azurerm_subnet.vnet_integration.id
}

output "pe_db_subnet_id" {
  value = azurerm_subnet.private_endpoint_db.id
}
