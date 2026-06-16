# 🔒 Full Azure Private Deployment Guide (Hardened Network)

This guide provides a step-by-step walkthrough for deploying the **OrganiStation Platform** using **Private Endpoints** for all services. This configuration ensures that your data and communication never leave the Azure backbone network.

---

## 🌐 Phase 0: Networking (The Foundation)

Before creating any services, you must establish a Virtual Network (VNET) to host the private endpoints.

1.  **Search**: "Virtual networks" > **+ Create**.
2.  **Name**: `Organistation-VNET`.
3.  **IP Addresses**: 
    *   `10.0.0.0/16` (VNET Address Space).
4.  **Subnets**: Create three subnets:
    *   `aks-subnet`: `10.0.1.0/24` (For your AKS nodes).
    *   `endpoint-subnet`: `10.0.2.0/24` (For all Private Endpoints).
5.  **Review + create** > **Create**.

---

## 🏗️ Phase 1: Storage & Databases (Private)

### 1. Azure Cosmos DB (Private)
*   **Create**: Select MongoDB API.
*   **Networking Tab**:
    1.  **Connectivity method**: `Private access`.
    2.  Click **+ Add Private Endpoint**.
    3.  **Name**: `cosmos-pe`.
    4.  **Subnet**: `endpoint-subnet`.
    5.  **Private DNS Zone**: Ensure "Integrate with private DNS zone" is **Checked**.

### 2. Azure Storage Account (Private)
*   **Create**: Standard performance, LRS.
*   **Networking Tab**:
    1.  **Connectivity method**: `Disable public access and use private access`.
    2.  Click **+ Add private endpoint**.
    3.  **Name**: `storage-pe`.
    4.  **Target sub-resource**: `blob`.
    5.  **Private DNS Zone**: Integrate with `privatelink.blob.core.windows.net`.

---

## 🔐 Phase 2: Security & Identity

### 3. Azure Key Vault (Private)
*   **Create**: RBAC based.
*   **Networking Tab**:
    1.  **Connectivity method**: `Private endpoint`.
    2.  Click **+ Add private endpoint**.
    3.  **Target sub-resource**: `vault`.
    4.  **Private DNS Zone**: Integrate with `privatelink.vaultcore.azure.net`.

### 4. Managed Identity & Azure Container Registry
*   **Managed Identity**: Create `Mahesh-AKS-uami` as usual.
*   **ACR (Premium Required for Private Endpoints)**:
    1.  **SKU**: Must be **Premium** (Basic/Standard do not support private endpoints).
    2.  **Networking Tab**: `Private access` > **+ Add private endpoint**.
    3.  **Private DNS Zone**: `privatelink.azurecr.io`.

---

## ☸️ Phase 3: AKS VNET Integration

### 5. Create AKS (Private Cluster)
*   **Basics**: Standard tier.
*   **Networking Tab**:
    1.  **Network configuration**: `Azure CNI` (Required for VNET integration).
    2.  **Virtual network**: Select `Organistation-VNET`.
    3.  **Subnet**: Select `aks-subnet`.
    4.  **Control Plane**: For maximum security, select **"Enable private cluster"**.
        *   *Note: If you enable private cluster, you will need a Jumpbox/VM inside the VNET to run `kubectl` commands.*

---

## 🛠️ Phase 4: Linking & Permissions

### 6. Link Identity to Nodes
As previously described, assign `Mahesh-AKS-uami` to the **Virtual Machine Scale Set** in the node resource group.

### 7. RBAC Roles
Assign **"Key Vault Secrets User"** and **"Storage Blob Data Contributor"** to your Manage Identity for the private resources.

---

## 🚀 Phase 5: Build & Deployment

### 8. Pushing Images (The Jumpbox)
Since your ACR and AKS are now private, you cannot push/pull from a public internet connection easily. 
1.  Create a small "Jumpbox" VM in the `Organistation-VNET`.
2.  Install Docker/Helm on this VM.
3.  Login and push your images from within the network.

### 9. Helm Deploy
From your Jumpbox:
```bash
cd helm-chart
helm upgrade --install organization . \
  --set global.azure.tenantId="<id>" \
  --set global.azure.identityClientId="<id>"
```

---

## 📝 Important: Private DNS Zone Resolution
Ensure all Private DNS Zones created during the process are **Linked** to the `Organistation-VNET` so your pods can resolve `maheshstoracc.privatelink.blob.core.windows.net` to its private IP.
