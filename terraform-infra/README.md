# OrganiStation Azure Infrastructure (Terraform)

This repository contains the production-grade Terraform code for deploying the OrganiStation microservices architecture on Azure.

## Architecture Overview

- **Region**: southindia
- **Resource Group**: Unified container for all environment resources.
- **Networking**: High-security Hub-and-Spoke-style VNets with Peering.
  - App Gateway VNet (`10.0.0.0/16`)
  - App Services VNet (`10.1.0.0/16`)
  - Database VNet (`10.2.0.0/16`)
- **Security**: 
  - Application Gateway WAF v2 for edge protection.
  - Private Endpoints for Key Vault, Storage, and Cosmos DB.
  - Managed Identities for all App Services.
  - RBAC and Key Vault for secret management.
- **Application Layer**: 6 Linux Web Apps for Containers running on a shared App Service Plan.
- **Database**: Cosmos DB (Mongo API) with continuous backup and private access only.
- **Monitoring**: Centralized Log Analytics and Application Insights.

## Directory Structure

```text
terraform-infra/
├── modules/
│   ├── networking/           # VNets, Subnets, Peering, NSGs
│   ├── application-gateway/  # WAF v2 Gateway
│   ├── app-service/          # Linux Web App for Containers logic
│   ├── cosmosdb/             # Mongo API Cosmos Account
│   ├── ...                   # (Other modules as requested)
├── main.tf                   # Root orchestration
├── variables.tf              # Root variables
├── dev.tfvars                # Environment specific vars
└── ...
```

## Prerequisites

1. Azure CLI authenticated.
2. Terraform CLI installed.
3. A Storage Account and Container created for the remote backend state.

## Deployment Instructions

### 1. Initialize Backend
Update `backend.tf` with your storage account details or provide them via command line:

```bash
terraform init \
  -backend-config="resource_group_name=<RG_NAME>" \
  -backend-config="storage_account_name=<ST_NAME>" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=dev.terraform.tfstate"
```

### 2. Plan Deployment
Use the environment-specific `.tfvars` file:

```bash
terraform plan -var-file="dev.tfvars"
```

### 3. Apply Infrastructure
```bash
terraform apply -var-file="dev.tfvars"
```

## Resource Tagging
All resources are automatically tagged with:
- `Project`: OrganiStation
- `Environment`: (from var)
- `Owner`: DevOps
- `CostCenter`: Engineering

## Security Notes
- No secrets are hardcoded; use `dev.tfvars` or environment variables (e.g., `TF_VAR_jwt_secret`).
- All data services are locked down with Private Endpoints.
- Public traffic is only allowed through the Application Gateway.
