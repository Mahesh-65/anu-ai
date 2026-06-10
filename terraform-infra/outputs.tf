output "resource_group_name" { value = module.resource_group.name }
output "vnet_ids" {
  value = {
    app_gw = module.networking.app_gw_vnet_id
    app_svc = module.networking.app_svc_vnet_id
    db = module.networking.db_vnet_id
  }
}
output "subnet_ids" {
  value = {
    app_gw = module.networking.app_gw_subnet_id
    app_svc_pe = module.networking.app_svc_pe_subnet_id
    app_svc_int = module.networking.app_svc_integration_subnet_id
    db_pe = module.networking.db_pe_subnet_id
  }
}
output "app_gateway_public_ip" { value = module.app_gateway.public_ip }
output "cosmos_endpoint" { value = module.cosmosdb.endpoint }
output "cosmos_connection_string" { 
  value = module.cosmosdb.primary_connection_string 
  sensitive = true
}
output "storage_account_name" { value = module.storage_account.name }
output "storage_endpoint" { value = module.storage_account.primary_blob_endpoint }
output "app_insights_connection_string" { 
  value     = module.monitoring.ai_connection_string 
  sensitive = true
}

output "frontend_url" { value = "https://${module.svc_frontend.default_hostname}" }
output "auth_url" { value = "https://${module.svc_auth.default_hostname}" }
output "hr_url" { value = "https://${module.svc_hr.default_hostname}" }
output "project_url" { value = "https://${module.svc_project.default_hostname}" }
output "finance_url" { value = "https://${module.svc_finance.default_hostname}" }
output "ai_url" { value = "https://${module.svc_ai.default_hostname}" }
