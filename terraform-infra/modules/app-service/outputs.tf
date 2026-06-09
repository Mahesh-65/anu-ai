output "app_id" {
  value = azurerm_linux_web_app.main.id
}

output "default_hostname" {
  value = azurerm_linux_web_app.main.default_hostname
}

output "principal_id" {
  value = azurerm_linux_web_app.main.identity[0].principal_id
}

output "app_url" {
  value = "https://${azurerm_linux_web_app.main.default_hostname}"
}
