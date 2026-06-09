resource "azurerm_private_endpoint" "main" {
  name                = "${var.prefix}-pe-${var.name}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "${var.prefix}-psc-${var.name}"
    private_connection_resource_id = var.resource_id
    is_manual_connection           = false
    subresource_names              = [var.subresource_name]
  }

  private_dns_zone_group {
    name                 = "dns-group"
    private_dns_zone_ids = [var.private_dns_zone_id]
  }

  tags = var.tags
}
