resource "azurerm_storage_account" "main" {
  name = var.storage_account_name
  resource_group_name = var.resource_group_name
  location = var.location
  account_tier = "Standard"
  account_replication_type = "LRS"
  public_network_access_enabled = false
  tags = var.tags
}

resource "azurerm_storage_container" "tfstate" {
  count = var.create_backend_container ? 1 : 0
  name = "tfstate"
  container_access_type = "private"
}
