# App Gateway VNet
resource "azurerm_virtual_network" "app_gateway" {
  name                = "${var.prefix}-appgw-vnet"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = ["10.0.0.0/16"]
  tags                = var.tags
}

resource "azurerm_subnet" "app_gateway" {
  name                 = "appgw-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.app_gateway.name
  address_prefixes     = ["10.0.1.0/24"]
}

# App Services VNet
resource "azurerm_virtual_network" "app_services" {
  name                = "${var.prefix}-apps-vnet"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = ["10.1.0.0/16"]
  tags                = var.tags
}

resource "azurerm_subnet" "private_endpoint_apps" {
  name                 = "pe-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.app_services.name
  address_prefixes     = ["10.1.1.0/24"]
}

resource "azurerm_subnet" "vnet_integration" {
  name                 = "vnet-integration-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.app_services.name
  address_prefixes     = ["10.1.2.0/24"]

  delegation {
    name = "delegation"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

# Database VNet
resource "azurerm_virtual_network" "database" {
  name                = "${var.prefix}-db-vnet"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = ["10.2.0.0/16"]
  tags                = var.tags
}

resource "azurerm_subnet" "private_endpoint_db" {
  name                 = "pe-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.database.name
  address_prefixes     = ["10.2.1.0/24"]
}

# VNet Peering: App Gateway <-> App Services
resource "azurerm_virtual_network_peering" "appgw_to_apps" {
  name                      = "appgw-to-apps"
  resource_group_name       = var.resource_group_name
  virtual_network_name      = azurerm_virtual_network.app_gateway.name
  remote_virtual_network_id = azurerm_virtual_network.app_services.id
}

resource "azurerm_virtual_network_peering" "apps_to_appgw" {
  name                      = "apps-to-appgw"
  resource_group_name       = var.resource_group_name
  virtual_network_name      = azurerm_virtual_network.app_services.name
  remote_virtual_network_id = azurerm_virtual_network.app_gateway.id
}

# VNet Peering: App Services <-> Database
resource "azurerm_virtual_network_peering" "apps_to_db" {
  name                      = "apps-to-db"
  resource_group_name       = var.resource_group_name
  virtual_network_name      = azurerm_virtual_network.app_services.name
  remote_virtual_network_id = azurerm_virtual_network.database.id
}

resource "azurerm_virtual_network_peering" "db_to_apps" {
  name                      = "db-to-apps"
  resource_group_name       = var.resource_group_name
  virtual_network_name      = azurerm_virtual_network.database.name
  remote_virtual_network_id = azurerm_virtual_network.app_services.id
}

# NSG for App Gateway
resource "azurerm_network_security_group" "appgw" {
  name                = "${var.prefix}-appgw-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  security_rule {
    name                       = "AllowGWM"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "65200-65535"
    source_address_prefix      = "GatewayManager"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowHTTP"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "appgw" {
  subnet_id                 = azurerm_subnet.app_gateway.id
  network_security_group_id = azurerm_network_security_group.appgw.id
}
