resource "azurerm_service_plan" "main" {
  name = var.name
  location = var.location
  resource_group_name = var.resource_group_name
  os_type = "Linux"
  sku_name = "B1"
  tags = var.tags
}
