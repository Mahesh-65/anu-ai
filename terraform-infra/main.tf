locals {
  prefix = lower("${var.project_name}-${var.environment}")
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    Owner       = "DevOps"
    CostCenter  = "Engineering"
  }
}

# 1. Resource Group
module "resource_group" {
  source              = "./modules/resource-group"
  resource_group_name = "${local.prefix}-rg"
  location            = var.location
  tags                = local.common_tags
}

# 2. Networking
module "networking" {
  source              = "./modules/networking"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  tags                = local.common_tags
}

# 3. Private DNS
module "private_dns" {
  source              = "./modules/private-dns"
  resource_group_name = module.resource_group.resource_group_name
  dns_zones = [
    "privatelink.vaultcore.azure.net",
    "privatelink.blob.core.windows.net",
    "privatelink.mongo.cosmos.azure.com"
  ]
  dns_vnet_links = [
    { zone_name = "privatelink.vaultcore.azure.net", vnet_name = "appgw-vnet", vnet_id = module.networking.appgw_vnet_id },
    { zone_name = "privatelink.vaultcore.azure.net", vnet_name = "apps-vnet", vnet_id = module.networking.apps_vnet_id },
    { zone_name = "privatelink.blob.core.windows.net", vnet_name = "apps-vnet", vnet_id = module.networking.apps_vnet_id },
    { zone_name = "privatelink.mongo.cosmos.azure.com", vnet_name = "apps-vnet", vnet_id = module.networking.apps_vnet_id }
  ]
  tags = local.common_tags
}

# 4. Key Vault
module "keyvault" {
  source              = "./modules/keyvault"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  allowed_ip          = var.allowed_ip
  tags                = local.common_tags
}

# 5. Storage Account
module "storage" {
  source              = "./modules/storage-account"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  tags                = local.common_tags
}

# 6. Cosmos DB
module "cosmosdb" {
  source              = "./modules/cosmosdb"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  tags                = local.common_tags
}

# 7. Private Endpoints
module "pe_keyvault" {
  source              = "./modules/private-endpoint"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  name                = "kv"
  subnet_id           = module.networking.pe_apps_subnet_id
  resource_id         = module.keyvault.key_vault_id
  subresource_name    = "vault"
  private_dns_zone_id = module.private_dns.dns_zone_ids["privatelink.vaultcore.azure.net"]
  tags                = local.common_tags
}

module "pe_storage" {
  source              = "./modules/private-endpoint"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  name                = "st"
  subnet_id           = module.networking.pe_apps_subnet_id
  resource_id         = module.storage.storage_account_id
  subresource_name    = "blob"
  private_dns_zone_id = module.private_dns.dns_zone_ids["privatelink.blob.core.windows.net"]
  tags                = local.common_tags
}

module "pe_cosmos" {
  source              = "./modules/private-endpoint"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  name                = "cosmos"
  subnet_id           = module.networking.pe_db_subnet_id
  resource_id         = module.cosmosdb.cosmosdb_id
  subresource_name    = "MongoDB"
  private_dns_zone_id = module.private_dns.dns_zone_ids["privatelink.mongo.cosmos.azure.com"]
  tags                = local.common_tags
}

# 8. Monitoring
module "monitoring" {
  source              = "./modules/monitoring"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  tags                = local.common_tags
}

# 9. App Service Plan
module "app_service_plan" {
  source              = "./modules/app-service-plan"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  sku_name            = "B1"
  tags                = local.common_tags
}

# 10. App Services

module "app_auth" {
  source              = "./modules/app-service"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  service_name        = "auth"
  service_plan_id     = module.app_service_plan.app_service_plan_id
  docker_image        = "maheshnandi/organistation-auth"
  docker_image_tag    = "v1.0.0"
  vnet_integration_subnet_id = module.networking.vnet_integration_subnet_id
  app_insights_connection_string = module.monitoring.app_insights_connection_string
  app_settings = {
    "MONGODB_URI" = module.cosmosdb.primary_mongodb_connection_string
    "JWT_SECRET"  = var.jwt_secret
    "INTERNAL_SERVICE_SECRET" = var.internal_service_secret
  }
  tags = local.common_tags
}

module "app_hr" {
  source              = "./modules/app-service"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  service_name        = "hr"
  service_plan_id     = module.app_service_plan.app_service_plan_id
  docker_image        = "maheshnandi/organistation-hr"
  docker_image_tag    = "v1.0.0"
  vnet_integration_subnet_id = module.networking.vnet_integration_subnet_id
  app_insights_connection_string = module.monitoring.app_insights_connection_string
  app_settings = {
    "MONGODB_URI" = module.cosmosdb.primary_mongodb_connection_string
    "INTERNAL_SERVICE_SECRET" = var.internal_service_secret
  }
  tags = local.common_tags
}

module "app_project" {
  source              = "./modules/app-service"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  service_name        = "project"
  service_plan_id     = module.app_service_plan.app_service_plan_id
  docker_image        = "maheshnandi/organistation-projects"
  docker_image_tag    = "v1.0.0"
  vnet_integration_subnet_id = module.networking.vnet_integration_subnet_id
  app_insights_connection_string = module.monitoring.app_insights_connection_string
  app_settings = {
    "MONGODB_URI" = module.cosmosdb.primary_mongodb_connection_string
    "INTERNAL_SERVICE_SECRET" = var.internal_service_secret
  }
  tags = local.common_tags
}

module "app_finance" {
  source              = "./modules/app-service"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  service_name        = "finance"
  service_plan_id     = module.app_service_plan.app_service_plan_id
  docker_image        = "maheshnandi/organistation-finance"
  docker_image_tag    = "v1.0.0"
  vnet_integration_subnet_id = module.networking.vnet_integration_subnet_id
  app_insights_connection_string = module.monitoring.app_insights_connection_string
  app_settings = {
    "MONGODB_URI" = module.cosmosdb.primary_mongodb_connection_string
    "INTERNAL_SERVICE_SECRET" = var.internal_service_secret
  }
  tags = local.common_tags
}

module "app_ai" {
  source              = "./modules/app-service"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  service_name        = "ai"
  service_plan_id     = module.app_service_plan.app_service_plan_id
  docker_image        = "maheshnandi/organistation-ai"
  docker_image_tag    = "v1.0.0"
  vnet_integration_subnet_id = module.networking.vnet_integration_subnet_id
  app_insights_connection_string = module.monitoring.app_insights_connection_string
  app_settings = {
    "GROQ_API_KEY" = var.groq_api_key
  }
  tags = local.common_tags
}

module "app_frontend" {
  source              = "./modules/app-service"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  service_name        = "frontend"
  service_plan_id     = module.app_service_plan.app_service_plan_id
  docker_image        = "maheshnandi/organistation-gateway"
  docker_image_tag    = "v1.0.0"
  vnet_integration_subnet_id = module.networking.vnet_integration_subnet_id
  app_insights_connection_string = module.monitoring.app_insights_connection_string
  app_settings = {
    "AUTH_SERVICE_URL"    = module.app_auth.app_url
    "AI_SERVICE_URL"      = module.app_ai.app_url
    "HR_SERVICE_URL"      = module.app_hr.app_url
    "PROJECT_SERVICE_URL" = module.app_project.app_url
    "FINANCE_SERVICE_URL" = module.app_finance.app_url
    "JWT_SECRET"          = var.jwt_secret
  }
  tags = local.common_tags
}

# 11. Application Gateway WAF v2
module "application_gateway" {
  source              = "./modules/application-gateway"
  resource_group_name = module.resource_group.resource_group_name
  location            = module.resource_group.location
  prefix              = local.prefix
  subnet_id           = module.networking.appgw_subnet_id
  frontend_fqdn       = module.app_frontend.default_hostname
  tags                = local.common_tags
}

# Secrets in Key Vault
resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret"
  value        = var.jwt_secret
  key_vault_id = module.keyvault.key_vault_id
  depends_on   = [module.keyvault]
}

resource "azurerm_key_vault_secret" "cosmos_connection" {
  name         = "cosmos-connection-string"
  value        = module.cosmosdb.primary_mongodb_connection_string
  key_vault_id = module.keyvault.key_vault_id
  depends_on   = [module.keyvault]
}

resource "azurerm_key_vault_secret" "storage_key" {
  name         = "storage-primary-access-key"
  value        = module.storage.primary_access_key
  key_vault_id = module.keyvault.key_vault_id
  depends_on   = [module.keyvault]
}
