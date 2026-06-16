# Full Azure Infrastructure & Deployment Guide (Portal UI)

This guide provides a comprehensive, start-to-finish walkthrough for deploying the **OrganiStation Microservices Platform** on Azure using the Portal UI.

---

## Phase 1: Core Infrastructure

### 1. Create a Resource Group
1.  Search for **"Resource groups"** and click **+ Create**.
2.  **Name**: `Mahesh-RG`.
3.  **Region**: `East US` (or your preferred region).
4.  Click **Review + create** > **Create**.

### 2. Create Azure Container Registry (ACR)
1.  Search for **"Container registries"** and click **+ Create**.
2.  **Registry name**: `organistationacr` (must be unique).
3.  **Resource group**: `Mahesh-RG`.
4.  **SKU**: `Basic`.
5.  Click **Review + create** > **Create**.

### 3. Create Azure Kubernetes Service (AKS)
1.  Search for **"Kubernetes services"** and click **+ Create**.
2.  **Cluster preset configuration**: `Dev/Test`.
3.  **Kubernetes cluster name**: `Mahesh-AKS`.
4.  **Region**: Same as your Resource Group.
5.  **Node size**: `Standard_DS2_v2` (or similar).
6.  **Scale method**: `Manual` with `1` node is enough for testing.
7.  Click **Review + create** > **Create**. (This takes 5-10 minutes).

### 4. Link ACR to AKS
1.  Go to your **Mahesh-AKS** resource.
2.  Click **Settings** > **Properties** (or **Settings** > **Networking**/<strong>Cluster configuration</strong> depending on Portal version).
3.  Look for **Container Registry** integration.
4.  Or use the CLI (more reliable): `az aks update -n Mahesh-AKS -g Mahesh-RG --attach-acr organistationacr`.

---

## Phase 2: Security & Identity

### 5. Create Azure Key Vault
1.  Search for **"Key vaults"** and click **+ Create**.
2.  **Key vault name**: `Mahesh-KeyV`.
3.  **Resource group**: `Mahesh-RG`.
4.  **Access configuration**: Choose **"Azure role-based access control" (RBAC)**.
5.  Click **Review + create** > **Create**.

### 6. Create User-Assigned Managed Identity
1.  Search for **"Managed Identities"** and click **+ Create**.
2.  **Name**: `Mahesh-AKS-uami`.
3.  Click **Review + create** > **Create**. Go to the resource.
4.  **Copy the Client ID and Tenant ID** from the Overview tab.

### 7. Link Identity to AKS Nodes
1.  Find the **Node Resource Group** (e.g., `MC_Mahesh-RG_Mahesh-AKS_eastus`).
2.  Open the **Virtual machine scale set** inside it.
3.  Go to **Settings** > **Identity** > **User assigned**.
4.  Click **+ Add** and select `Mahesh-AKS-uami`.

### 8. Grant Key Vault Permissions
1.  Go to `Mahesh-KeyV` > **Access control (IAM)** > **+ Add Role Assignment**.
2.  **Role**: `Key Vault Secrets User`.
3.  **Assign access to**: `Managed identity`.
4.  Select `Mahesh-AKS-uami`.
5.  Click **Review + assign**.

---

## Phase 3: Application Data & Configuration

### 9. Add Secrets to Key Vault
Go to `Mahesh-KeyV` > **Secrets** > **+ Generate/Import**. Create these:
*   `jwt-secret`
*   `internal-secret`
*   `storage-key`
*   `groq-api-key`
*   `cosmos-connection-string`

### 10. Building & Pushing Images
From your local terminal (ensure Docker is running):

```powershell
az acr login --name organistationacr

# Run these for each service (auth, ai, hr, finance, projects, gateway)
docker tag maheshnandi/organistation-auth:latest organistationacr.azurecr.io/organistation-auth:v1.0.0
docker push organistationacr.azurecr.io/organistation-auth:v1.0.0
# ... repeated for all 6
```

---

## Phase 4: Final Deployment

### 11. Update Helm Values
In `helm-chart/values.yaml`, ensure these match your portal settings:
```yaml
global:
  azure:
    tenantId: "<Your-Tenant-ID>"
    keyvaultName: "Mahesh-KeyV"
    storageAccountName: "maheshstoracc"
    identityClientId: "<Your-Identity-Client-ID>"
    registryServer: "organistationacr.azurecr.io"
```

### 12. Deploy the Platform
Run these commands locally:
```bash
cd helm-chart
helm upgrade --install organization .
```

### 13. Verify Everything
```bash
# Check if pods are running
kubectl get pods

# Check if secrets were sync'd from Key Vault
kubectl get secrets

# Check external IP for Gateway
kubectl get svc gateway-service
```

---
**Congratulations!** Your luxury microservices platform is now live on Azure.
