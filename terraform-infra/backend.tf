terraform {
  backend "azurerm" {
    # Values should be provided via -backend-config or initialized manually
    # resource_group_name  = "terraform-state-rg"
    # storage_account_name = "tstateorganistation"
    # container_name       = "tfstate"
    # key                  = "organistation.terraform.tfstate"
  }
}
