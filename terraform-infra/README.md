# OrganiStation Terraform Platform

This repository contains the complete Terraform infrastructure for the OrganiStation microservices platform on Azure.

## Prerequisites

1.  **Azure Account**: An active Azure subscription (Free Account compatible).
2.  **Terraform CLI**: Installed and configured.

## Architecture

*   **Single Resource Group**: All resources reside in one logical group.
*   **Networking**: 3 isolated VNets (Gateway, App Services, Database) with Peering.
*   **Storage**: Cosmos DB (MongoDB API) and Azure Blob Storage.
*   **Compute**: Linux App Services running Docker Hub images (F1 Free Tier).
*   **Access**: Application Gateway (Standard_v2) acts as the single public entry point.
*   **Security**: Private Endpoints and Private DNS ensure internal traffic stays off the public internet.

## Deployment Instructions

### 1. Initialize Terraform
```bash
cd terraform-infra
terraform init
```

### 2. Plan the Deployment (Development Environment)
```bash
terraform plan -var-file="dev.tfvars"
```

### 3. Apply the Infrastructure
```bash
terraform apply -var-file="dev.tfvars" -auto-approve
```

## Important Notes

*   **State Management**: This configuration uses **Local State**. Keep the `terraform.tfstate` file safe if you intend to manage these resources later.
*   **Free Tier**: The infrastructure is optimized for Azure Free Accounts using F1 App Service Plans and Cosmos DB Free Tier.
*   **Environment Variables**: All microservice communication and secrets are handled via App Service Environment Variables.
*   **Internal URLs**: Services communicate using internal `.azurewebsites.net` FQDNs via Private DNS.
*   **Gateway**: Only the Gateway (Frontend) is exposed via the Application Gateway Public IP.
