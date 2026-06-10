output "app_gw_vnet_id" { value = azurerm_virtual_network.app_gw_vnet.id }
output "app_svc_vnet_id" { value = azurerm_virtual_network.app_svc_vnet.id }
output "db_vnet_id" { value = azurerm_virtual_network.db_vnet.id }

output "app_gw_subnet_id" { value = azurerm_subnet.app_gw_subnet.id }
output "app_svc_pe_subnet_id" { value = azurerm_subnet.app_svc_pe_subnet.id }
output "app_svc_integration_subnet_id" { value = azurerm_subnet.app_svc_integration_subnet.id }
output "db_pe_subnet_id" { value = azurerm_subnet.db_pe_subnet.id }
