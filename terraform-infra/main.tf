locals {
  common_tags = merge(var.tags, {
    Environment = var.environment
  })
}

# 1. Resource Group
module "resource_group" {
  source = "./modules/resource-group"
  name = "${var.project_name}-rg"
  location = var.location
  tags = local.common_tags
}

# 2. Networking
module "networking" {
  source = "./modules/networking"
  resource_group_name = module.resource_group.name
  location = module.resource_group.location
  environment = var.environment
  project_name = var.project_name
  tags = local.common_tags
}

# 3. Private DNS
module "private_dns" {
  source = "./modules/private-dns"
  resource_group_name = module.resource_group.name
  app_gw_vnet_id = module.networking.app_gw_vnet_id
  app_svc_vnet_id = module.networking.app_svc_vnet_id
  db_vnet_id = module.networking.db_vnet_id
  tags = local.common_tags
}

# 4. Storage Account
module "storage_account" {
  source = "./modules/storage-account"
  resource_group_name = module.resource_group.name
  location = module.resource_group.location
  storage_account_name = "${var.project_name}${var.environment}data"
  tags = local.common_tags
}

# 5. Cosmos DB
module "cosmosdb" {
  source = "./modules/cosmosdb"
  resource_group_name = module.resource_group.name
  location = module.resource_group.location
  name = "${var.project_name}-${var.environment}-cosmos"
  tags = local.common_tags
}

# 6. Private Endpoints
module "pe_cosmos" {
  source = "./modules/private-endpoint"
  name = "${var.project_name}-cosmos-pe"
  resource_group_name = module.resource_group.name
  location = module.resource_group.location
  subnet_id = module.networking.db_pe_subnet_id
  resource_id = module.cosmosdb.id
  subresource_names = ["MongoDB"]
  private_dns_zone_ids = [module.private_dns.db_zone_id]
  tags = local.common_tags
}

module "pe_storage" {
  source = "./modules/private-endpoint"
  name = "${var.project_name}-storage-pe"
  resource_group_name = module.resource_group.name
  location = module.resource_group.location
  subnet_id = module.networking.app_svc_pe_subnet_id
  resource_id = module.storage_account.id
  subresource_names = ["blob"]
  private_dns_zone_ids = [module.private_dns.storage_zone_id]
  tags = local.common_tags
}

# 7. Monitoring
module "monitoring" {
  source = "./modules/monitoring"
  resource_group_name = module.resource_group.name
  location = module.resource_group.location
  law_name = "${var.project_name}-law"
  ai_name = "${var.project_name}-ai-insights"
  tags = local.common_tags
}

# 8. App Service Plan
module "app_svc_plan" {
  source = "./modules/app-service-plan"
  resource_group_name = module.resource_group.name
  location = module.resource_group.location
  name = "${var.project_name}-plan"
  tags = local.common_tags
}

# 9. App Services
module "svc_auth" {
  source = "./modules/app-service"
  name = "${var.project_name}-auth"
  location = module.resource_group.location
  resource_group_name = module.resource_group.name
  service_plan_id = module.app_svc_plan.id
  docker_image = "maheshnandi/organistation-auth:v1.0.0"
  port = "8001"
  ai_connection_string = module.monitoring.ai_connection_string
  vnet_integration_subnet_id = module.networking.app_svc_integration_subnet_id
  tags = local.common_tags
  app_settings = {
    COSMOS_CONNECTION_STRING = module.cosmosdb.primary_connection_string
    JWT_SECRET = var.jwt_secret
    STORAGE_ACCOUNT_NAME = module.storage_account.name
    STORAGE_ACCOUNT_KEY = module.storage_account.primary_access_key
  }
}

module "svc_hr" {
  source = "./modules/app-service"
  name = "${var.project_name}-hr"
  location = module.resource_group.location
  resource_group_name = module.resource_group.name
  service_plan_id = module.app_svc_plan.id
  docker_image = "maheshnandi/organistation-hr:v1.0.0"
  port = "8002"
  ai_connection_string = module.monitoring.ai_connection_string
  vnet_integration_subnet_id = module.networking.app_svc_integration_subnet_id
  tags = local.common_tags
  app_settings = {
    COSMOS_CONNECTION_STRING = module.cosmosdb.primary_connection_string
    STORAGE_ACCOUNT_NAME = module.storage_account.name
    STORAGE_ACCOUNT_KEY = module.storage_account.primary_access_key
  }
}

module "svc_project" {
  source = "./modules/app-service"
  name = "${var.project_name}-proj"
  location = module.resource_group.location
  resource_group_name = module.resource_group.name
  service_plan_id = module.app_svc_plan.id
  docker_image = "maheshnandi/organistation-projects:v1.0.0"
  port = "8003"
  ai_connection_string = module.monitoring.ai_connection_string
  vnet_integration_subnet_id = module.networking.app_svc_integration_subnet_id
  tags = local.common_tags
  app_settings = {
    COSMOS_CONNECTION_STRING = module.cosmosdb.primary_connection_string
    STORAGE_ACCOUNT_NAME = module.storage_account.name
    STORAGE_ACCOUNT_KEY = module.storage_account.primary_access_key
  }
}

module "svc_finance" {
  source = "./modules/app-service"
  name = "${var.project_name}-fin"
  location = module.resource_group.location
  resource_group_name = module.resource_group.name
  service_plan_id = module.app_svc_plan.id
  docker_image = "maheshnandi/organistation-finance:v1.0.0"
  port = "8004"
  ai_connection_string = module.monitoring.ai_connection_string
  vnet_integration_subnet_id = module.networking.app_svc_integration_subnet_id
  tags = local.common_tags
  app_settings = {
    COSMOS_CONNECTION_STRING = module.cosmosdb.primary_connection_string
    STORAGE_ACCOUNT_NAME = module.storage_account.name
    STORAGE_ACCOUNT_KEY = module.storage_account.primary_access_key
  }
}

module "svc_ai" {
  source = "./modules/app-service"
  name = "${var.project_name}-ai"
  location = module.resource_group.location
  resource_group_name = module.resource_group.name
  service_plan_id = module.app_svc_plan.id
  docker_image = "maheshnandi/organistation-ai:v1.0.0"
  port = "8000"
  ai_connection_string = module.monitoring.ai_connection_string
  vnet_integration_subnet_id = module.networking.app_svc_integration_subnet_id
  tags = local.common_tags
  app_settings = {
    COSMOS_CONNECTION_STRING = module.cosmosdb.primary_connection_string
    STORAGE_ACCOUNT_NAME = module.storage_account.name
    STORAGE_ACCOUNT_KEY = module.storage_account.primary_access_key
  }
}

module "svc_frontend" {
  source = "./modules/app-service"
  name = "${var.project_name}-gateway"
  location = module.resource_group.location
  resource_group_name = module.resource_group.name
  service_plan_id = module.app_svc_plan.id
  docker_image = "maheshnandi/organistation-gateway:v1.0.0"
  port = "3000"
  ai_connection_string = module.monitoring.ai_connection_string
  vnet_integration_subnet_id = module.networking.app_svc_integration_subnet_id
  tags = local.common_tags
  app_settings = {
    AUTH_SERVICE_URL = "https://${module.svc_auth.default_hostname}"
    HR_SERVICE_URL = "https://${module.svc_hr.default_hostname}"
    PROJECT_SERVICE_URL = "https://${module.svc_project.default_hostname}"
    FINANCE_SERVICE_URL = "https://${module.svc_finance.default_hostname}"
    AI_SERVICE_URL = "https://${module.svc_ai.default_hostname}"
    STORAGE_ACCOUNT_NAME = module.storage_account.name
    STORAGE_ACCOUNT_KEY = module.storage_account.primary_access_key
  }
}

# Private Endpoints for App Services (to enable internal communication via DNS)
module "pe_auth" {
  source = "./modules/private-endpoint"
  name = "${var.project_name}-auth-pe"
  resource_group_name = module.resource_group.name
  location = module.resource_group.location
  subnet_id = module.networking.app_svc_pe_subnet_id
  resource_id = module.svc_auth.id
  subresource_names = ["sites"]
  private_dns_zone_ids = [module.private_dns.web_zone_id]
  tags = local.common_tags
}

# 10. Application Gateway
module "app_gateway" {
  source = "./modules/application-gateway"
  name = "${var.project_name}-agw"
  resource_group_name = module.resource_group.name
  location = module.resource_group.location
  subnet_id = module.networking.app_gw_subnet_id
  frontend_fqdn = module.svc_frontend.default_hostname
  tags = local.common_tags
}
