output "name" { value = azurerm_storage_account.main.name }
output "id" { value = azurerm_storage_account.main.id }
output "primary_access_key" { 
  value = azurerm_storage_account.main.primary_access_key 
  sensitive = true
}
output "primary_blob_endpoint" { value = azurerm_storage_account.main.primary_blob_endpoint }
