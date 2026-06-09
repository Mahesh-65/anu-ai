resource "azurerm_storage_account" "main" {
  name                     = lower(replace("${var.prefix}st", "-", ""))
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  public_network_access_enabled = false
  tags                     = var.tags
}
