output "public_ip" {
  value = azurerm_public_ip.main.ip_address
}

output "gateway_id" {
  value = azurerm_application_gateway.main.id
}
