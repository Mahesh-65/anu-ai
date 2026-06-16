# 🚀 Full Azure Production Deployment Guide (Step-by-Step UI)

This guide provides a comprehensive walkthrough for deploying the **OrganiStation Microservices Platform** on Azure. It includes every resource, recommended configuration settings, and post-creation steps.

---

## 🏗️ Phase 1: Resource Group & Registry

### 1. Resource Group (The Container)
*   **Search**: "Resource groups" > **+ Create**.
*   **Name**: `Mahesh-RG`.
*   **Region**: `East US` (Consistency is key for latency and costs).
*   **After Creation**: This will be your dashboard for all resources.

### 2. Azure Container Registry (The Image Store)
*   **Search**: "Container registries" > **+ Create**.
*   **Registry name**: `organistationacr` (Unique).
*   **SKU**: `Basic`.
*   **Encryption**: Leave as "Service-managed key".
*   **After Creation**: Go to **Settings > Access keys** and enable **"Admin user"**. (Useful for local testing).

---

## 📂 Phase 2: Storage & Databases

### 3. Azure Storage Account (For AI Documents)
*   **Search**: "Storage accounts" > **+ Create**.
*   **Storage account name**: `maheshstoracc`.
*   **Performance**: `Standard`.
*   **Redundancy**: `Locally-redundant storage (LRS)` (Cheapest).
*   **Advanced**: Ensure "Allow public access from individual containers" is checked if you need direct PDF streaming.
*   **After Creation**: Go to **Data storage > Containers** and click **+ Container**. Name it `organistation-docs` with `Private` access level.
*   **Keys**: Go to **Security + networking > Access keys**. Copy `key1` string.

### 4. Azure Cosmos DB (The Database)
*   **Search**: "Azure Cosmos DB" > **+ Create**.
*   **API**: Select **"Azure Cosmos DB for MongoDB"**.
*   **Resource Group**: `Mahesh-RG`.
*   **Account Name**: `organistation-db`.
*   **Capacity Mode**: `Serverless` (Best for cost control during dev/test).
*   **After Creation**: Go to **Settings > Connection strings**. Copy the **Primary Connection String**.

---

## 🔐 Phase 3: Security & Identity

### 5. Azure Key Vault (The Secret Store)
*   **Search**: "Key vaults" > **+ Create**.
*   **Name**: `Mahesh-KeyV`.
*   **Access configuration**: Select **"Azure role-based access control (RBAC)"**.
*   **After Creation**: Go to **Settings > Secrets** and add:
    *   `cosmos-connection-string`: (The Primary String from Step 4)
    *   `storage-key`: (The Access Key from Step 3)
    *   `jwt-secret`: (Create a strong random string)
    *   `internal-secret`: (Create another strong random string)
    *   `groq-api-key`: (Your Groq/OpenAI key)

### 6. User-Assigned Managed Identity
*   **Search**: "Managed Identities" > **+ Create**.
*   **Name**: `Mahesh-AKS-uami`.
*   **After Creation**: Copy the **Client ID** and **Tenant ID**.

---

## ☸️ Phase 4: Kubernetes Setup

### 7. Azure Kubernetes Service (AKS)
*   **Search**: "Kubernetes services" > **+ Create**.
*   **Cluster name**: `Mahesh-AKS`.
*   **API Server availability**: `99.5%`.
*   **Workload Identity**: In the **Advanced** tab, ensure **"Enable Workload Identity"** and **"OIDC issuer"** are **CHECKED**.
*   **Azure Key Vault Secrets Provider**: In the **Integrations** tab, check **"Enable Azure Key Vault Secrets Provider"**.
*   **After Creation**:
    1.  **Link ACR**: Go to **Settings > Cluster configuration** and select `organistationacr`.
    2.  **Add Identity to Nodes**: Go to the **Node Resource Group** (e.g., `MC_Mahesh-RG...`), find the **Virtual Machine Scale Set**, go to **Identity > User assigned**, and add `Mahesh-AKS-uami`.

### 8. Final RBAC Linking
1.  Go to **Key Vault > Access Control (IAM) > Add role assignment**.
2.  **Role**: `Key Vault Secrets User`.
3.  **Assign access to**: `Managed Identity` > `Mahesh-AKS-uami`.

---

## 🚀 Phase 5: Build & Deployment

### 9. Build and Push Images
Run this locally in your CLI:
```bash
az acr login --name organistationacr

# Build your images (example for auth)
cd auth-service
docker build -t organistationacr.azurecr.io/organistation-auth:v1.0.0 .
docker push organistationacr.azurecr.io/organistation-auth:v1.0.0
# Repeat for all 6 services
```

### 10. Configure Helm
Update `helm-chart/values.yaml`:
*   `global.azure.tenantId`: (From Step 6)
*   `global.azure.identityClientId`: (From Step 6)
*   `global.azure.keyvaultName`: `Mahesh-KeyV`
*   `global.azure.storageAccountName`: `maheshstoracc`

### 11. Run the Launch
```bash
cd helm-chart
helm upgrade --install organization .
```

---

## ✅ Phase 6: Verify Deployment
1.  **Pods**: `kubectl get pods`.
2.  **Secrets**: `kubectl get secrets` (Verify `ai-service-secret`, etc. exist).
3.  **Public URL**: `kubectl get svc gateway-service` (Use the `EXTERNAL-IP`).
