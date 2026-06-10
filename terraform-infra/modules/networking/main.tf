# App Gateway VNet
resource "azurerm_virtual_network" "app_gw_vnet" {
  name = "app-gw-vnet"
  address_space = ["10.0.0.0/16"]
  location = var.location
  resource_group_name = var.resource_group_name
  tags = var.tags
}

resource "azurerm_subnet" "app_gw_subnet" {
  name = "app-gw-subnet"
  resource_group_name = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.app_gw_vnet.name
  address_prefixes = ["10.0.1.0/24"]
}

# App Services VNet
resource "azurerm_virtual_network" "app_svc_vnet" {
  name = "app-svc-vnet"
  address_space = ["10.1.0.0/16"]
  location = var.location
  resource_group_name = var.resource_group_name
  tags = var.tags
}

resource "azurerm_subnet" "app_svc_pe_subnet" {
  name = "pe-subnet"
  resource_group_name = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.app_svc_vnet.name
  address_prefixes = ["10.1.1.0/24"]
}

resource "azurerm_subnet" "app_svc_integration_subnet" {
  name = "integration-subnet"
  resource_group_name = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.app_svc_vnet.name
  address_prefixes = ["10.1.2.0/24"]
  delegation {
    name = "delegation"
    service_delegation {
      name = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

# Database VNet
resource "azurerm_virtual_network" "db_vnet" {
  name = "db-vnet"
  address_space = ["10.2.0.0/16"]
  location = var.location
  resource_group_name = var.resource_group_name
  tags = var.tags
}

resource "azurerm_subnet" "db_pe_subnet" {
  name = "db-pe-subnet"
  resource_group_name = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.db_vnet.name
  address_prefixes = ["10.2.1.0/24"]
}

# Peering: Gateway <-> App Services
resource "azurerm_virtual_network_peering" "gw_to_svc" {
  name = "gw-to-svc"
  resource_group_name = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.app_gw_vnet.name
  remote_virtual_network_id = azurerm_virtual_network.app_svc_vnet.id
}

resource "azurerm_virtual_network_peering" "svc_to_gw" {
  name = "svc-to-gw"
  resource_group_name = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.app_svc_vnet.name
  remote_virtual_network_id = azurerm_virtual_network.app_gw_vnet.id
}

# Peering: App Services <-> Database
resource "azurerm_virtual_network_peering" "svc_to_db" {
  name = "svc-to-db"
  resource_group_name = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.app_svc_vnet.name
  remote_virtual_network_id = azurerm_virtual_network.db_vnet.id
}

resource "azurerm_virtual_network_peering" "db_to_svc" {
  name = "db-to-svc"
  resource_group_name = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.db_vnet.name
  remote_virtual_network_id = azurerm_virtual_network.app_svc_vnet.id
}

# NSGs
resource "azurerm_network_security_group" "app_gw_nsg" {
  name = "app-gw-nsg"
  location = var.location
  resource_group_name = var.resource_group_name
  tags = var.tags

  security_rule {
    name = "AllowGWM"
    priority = 100
    direction = "Inbound"
    access = "Allow"
    protocol = "Tcp"
    source_port_range = "*"
    destination_port_range = "65200-65535"
    source_address_prefix = "GatewayManager"
    destination_address_prefix = "*"
  }

  security_rule {
    name = "AllowHTTP"
    priority = 110
    direction = "Inbound"
    access = "Allow"
    protocol = "Tcp"
    source_port_range = "*"
    destination_port_range = "80"
    source_address_prefix = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "app_gw_assoc" {
  subnet_id = azurerm_subnet.app_gw_subnet.id
  network_security_group_id = azurerm_network_security_group.app_gw_nsg.id
}
