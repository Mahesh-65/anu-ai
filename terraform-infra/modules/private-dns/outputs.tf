output "web_zone_name" { value = azurerm_private_dns_zone.web.name }
output "web_zone_id" { value = azurerm_private_dns_zone.web.id }
output "db_zone_name" { value = azurerm_private_dns_zone.db.name }
output "db_zone_id" { value = azurerm_private_dns_zone.db.id }
output "storage_zone_name" { value = azurerm_private_dns_zone.storage.name }
output "storage_zone_id" { value = azurerm_private_dns_zone.storage.id }
