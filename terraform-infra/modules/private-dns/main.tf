resource "azurerm_private_dns_zone" "zones" {
  for_each            = toset(var.dns_zones)
  name                = each.value
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "links" {
  for_each              = { for pair in var.dns_vnet_links : "${pair.zone_name}-${pair.vnet_name}" => pair }
  name                  = "${each.value.zone_name}-link-to-${each.value.vnet_name}"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = each.value.zone_name
  virtual_network_id    = each.value.vnet_id
  depends_on            = [azurerm_private_dns_zone.zones]
}
