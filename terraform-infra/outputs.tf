output "resource_group_name" {
  value = module.resource_group.resource_group_name
}

output "vnet_ids" {
  value = {
    appgw = module.networking.appgw_vnet_id
    apps  = module.networking.apps_vnet_id
    db    = module.networking.db_vnet_id
  }
}

output "app_gateway_public_ip" {
  value = module.application_gateway.public_ip
}

output "key_vault_uri" {
  value = module.keyvault.key_vault_uri
}

output "cosmos_endpoint" {
  value = module.cosmosdb.cosmosdb_endpoint
}

output "storage_endpoint" {
  value = module.storage.primary_blob_endpoint
}

output "app_insights_connection_string" {
  value     = module.monitoring.app_insights_connection_string
  sensitive = true
}

output "service_urls" {
  value = {
    frontend = module.app_frontend.app_url
    auth     = module.app_auth.app_url
    hr       = module.app_hr.app_url
    project  = module.app_project.app_url
    finance  = module.app_finance.app_url
    ai       = module.app_ai.app_url
  }
}
