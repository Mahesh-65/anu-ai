output "law_id" { value = azurerm_log_analytics_workspace.main.id }
output "ai_connection_string" { value = azurerm_application_insights.main.connection_string }
output "ai_instrumentation_key" { value = azurerm_application_insights.main.instrumentation_key }
output "ai_id" { value = azurerm_application_insights.main.id }
