# 📗 Beginner's Guide: Private Microservices Deployment on Azure

This guide is designed to help you build a professional, secure, and private microservices platform from scratch. We will use the **Azure Portal UI** for setup and simple terminal commands for deployment.

---

## 🛠️ Prerequisites
1.  **Azure Account**: You need an active subscription.
2.  **Azure CLI**: [Install here](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli).
3.  **Docker**: Installed and running on your machine.
4.  **Helm**: [Install here](https://helm.sh/docs/intro/install/).

---

## 🏁 Phase 1: The Network (The "Secure Garden")
Before building anything, we need a private space for our apps to live in.

1.  **Create VNET**: Search "Virtual networks" > **+ Create**.
    *   **Resource Group**: Create new > `Mahesh-RG`.
    *   **Name**: `Organistation-VNET`.
    *   **IP Addresses**: Click **Next** and keep the defaults (`10.0.0.0/16`).
2.  **Create Subnets**: In the **IP Addresses** tab, click **+ Add subnet**.
    *   Subnet 1: `aks-nodes` (Address: `10.0.1.0/24`).
    *   Subnet 2: `private-endpoints` (Address: `10.0.2.0/24`).
3.  Click **Review + create** > **Create**.

---

## 💎 Phase 2: Private Databases & Storage
We want our data to be invisible to the public internet.

### 1. Azure Cosmos DB (Your Database)
*   Search "Azure Cosmos DB" > **+ Create** > select **"Azure Cosmos DB for MongoDB"**.
*   **Networking Tab**:
    1.  Select **"Private access"**.
    2.  Click **+ Add Private Endpoint**.
    3.  **Name**: `cosmos-pe`.
    4.  **Subnet**: Select `private-endpoints`.
*   **After Creation**: Go to **Settings > Connection strings** and copy the **Primary Connection String**.

### 2. Azure Storage Account (Your File Store)
*   Search "Storage accounts" > **+ Create**.
*   **Name**: `maheshstoracc`.
*   **Networking Tab**:
    1.  Select **"Private access"**.
    2.  Click **+ Add private endpoint**.
    3.  **Sub-resource**: Select `blob`.
*   **After Creation**: Go to **Access keys** and copy **Key 1**.

---

## 🔐 Phase 3: Identity & Security

### 3. Azure Key Vault (The Secret Safe)
*   Search "Key vaults" > **+ Create**.
*   **Access configuration**: Select **"Azure role-based access control (RBAC)"**.
*   **Networking Tab**: Select **"Private access"** and add a private endpoint for `vault`.
*   **After Creation**: Go to **Secrets** and add your connection strings and keys from Phase 2.

### 4. Managed Identity
*   Search "Managed Identities" > **+ Create**.
*   **Name**: `Mahesh-AKS-uami`.
*   **After Creation**: Copy the **Client ID** and **Tenant ID**.

---

## ☸️ Phase 4: The Kubernetes Cluster

### 5. Azure Kubernetes Service (AKS)
*   Search "Kubernetes services" > **+ Create**.
*   **Integrations Tab**:
    1.  **Container Registry**: Click **Create new** > name it `organistationacr` > select **Premium SKU** (Required for private).
    2.  **Azure Key Vault Secrets Provider**: Check **Enabled**.
*   **Networking Tab**:
    1.  **Network configuration**: Select `Azure CNI`.
    2.  **Virtual network**: Select `Organistation-VNET`.
    3.  **Subnet**: Select `aks-nodes`.
*   **After Creation**:
    1.  Connect via terminal: `az aks get-credentials -g Mahesh-RG -n Mahesh-AKS`.
    2.  Give permissions: `az aks update -n Mahesh-AKS -g Mahesh-RG --attach-acr organistationacr`.

---

## 🚀 Phase 5: Pushing Your Code & Deploying

### 1. Push Images to Registry
Open your terminal and run these for each service:
```bash
az acr login --name organistationacr
docker tag maheshnandi/organistation-auth:latest organistationacr.azurecr.io/organistation-auth:v1.0.0
docker push organistationacr.azurecr.io/organistation-auth:v1.0.0
```

### 2. Update Helm Values
Open `helm-chart/values.yaml` and paste your IDs:
```yaml
global:
  azure:
    tenantId: "Your-Tenant-ID-from-Step-4"
    identityClientId: "Your-Client-ID-from-Step-4"
```

### 3. Final Launch
```bash
cd helm-chart
helm upgrade --install organization .
```

---

## 🔍 How to Verify
1.  **Check Pods**: `kubectl get pods` (All should say `Running`).
2.  **Check Secrets**: `kubectl get secrets` (You should see `ai-service-secret`, etc.).
3.  **Access App**: `kubectl get svc gateway-service` (Use the External-IP in your browser).

---
**Tip for Beginners**: If a command fails, ensure you are logged in to Azure with `az login` first!
