output "endpoint" { value = azurerm_cosmosdb_account.main.endpoint }
output "primary_connection_string" { 
  value = azurerm_cosmosdb_account.main.primary_mongodb_connection_string 
  sensitive = true
}
output "id" { value = azurerm_cosmosdb_account.main.id }
