resource "azurerm_cosmosdb_account" "main" {
  name = var.name
  location = var.location
  resource_group_name = var.resource_group_name
  offer_type = "Standard"
  kind = "MongoDB"

  free_tier_enabled = true
  public_network_access_enabled = false

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location = var.location
    failover_priority = 0
  }

  capabilities {
    name = "EnableMongo"
  }

  tags = var.tags
}

resource "azurerm_cosmosdb_mongo_database" "main" {
  name = "organistation"
  resource_group_name = var.resource_group_name
  account_name = azurerm_cosmosdb_account.main.name
}

resource "azurerm_cosmosdb_mongo_collection" "users" {
  name = "users"
  resource_group_name = var.resource_group_name
  account_name = azurerm_cosmosdb_account.main.name
  database_name = azurerm_cosmosdb_mongo_database.main.name
  index {
    keys = ["_id"]
    unique = true
  }
}

resource "azurerm_cosmosdb_mongo_collection" "employees" {
  name = "employees"
  resource_group_name = var.resource_group_name
  account_name = azurerm_cosmosdb_account.main.name
  database_name = azurerm_cosmosdb_mongo_database.main.name
  index {
    keys = ["_id"]
  }
}

resource "azurerm_cosmosdb_mongo_collection" "projects" {
  name = "projects"
  resource_group_name = var.resource_group_name
  account_name = azurerm_cosmosdb_account.main.name
  database_name = azurerm_cosmosdb_mongo_database.main.name
  index {
    keys = ["_id"]
  }
}

resource "azurerm_cosmosdb_mongo_collection" "finance" {
  name = "finance"
  resource_group_name = var.resource_group_name
  account_name = azurerm_cosmosdb_account.main.name
  database_name = azurerm_cosmosdb_mongo_database.main.name
  index {
    keys = ["_id"]
  }
}
