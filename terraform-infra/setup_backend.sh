#!/bin/bash

# Configuration
RG_NAME="terraform-state-rg"
LOCATION="southindia"
STORAGE_NAME="storganistatestate$RANDOM" 
CONTAINER_NAME="tfstate"

echo "------------------------------------------------"
echo "🚀 Starting Azure Backend Setup"
echo "------------------------------------------------"

echo "Creating Resource Group: $RG_NAME..."
az group create --name $RG_NAME --location $LOCATION

echo "Creating Storage Account: $STORAGE_NAME..."
az storage account create --name $STORAGE_NAME --resource-group $RG_NAME --sku Standard_LRS --allow-blob-public-access false

echo "Creating Blob Container: $CONTAINER_NAME..."
az storage container create --name $CONTAINER_NAME --account-name $STORAGE_NAME

echo "------------------------------------------------"
echo "✅ BACKEND SETUP COMPLETE"
echo "------------------------------------------------"
echo "Run this command to initialize Terraform:"
echo ""
echo "terraform init \\"
echo "  -backend-config=\"resource_group_name=$RG_NAME\" \\"
echo "  -backend-config=\"storage_account_name=$STORAGE_NAME\" \\"
echo "  -backend-config=\"container_name=$CONTAINER_NAME\" \\"
echo "  -backend-config=\"key=dev.tfstate\""
echo "------------------------------------------------"
