# Azure Portal Setup Guide: Managed Identity & Key Vault Integration

This guide provides step-by-step instructions for configuring **User-Assigned Managed Identity** for your OrganiStation microservices using the **Azure Portal**.

---

## Step 1: Create User-Assigned Managed Identity

1.  Log in to the [Azure Portal](https://portal.azure.com).
2.  In the search bar at the top, type **"Managed Identities"** and select it.
3.  Click **+ Create**.
4.  In the **Basics** tab:
    *   **Subscription**: Select your active subscription.
    *   **Resource Group**: Select `Mahesh-RG`.
    *   **Region**: Select the same region as your AKS cluster (e.g., `East US`).
    *   **Name**: Enter `Mahesh-AKS-uami`.
5.  Click **Review + create**, then click **Create**.
6.  Once the deployment is complete, click **Go to resource**.
7.  **IMPORTANT**: Copy the **Client ID** and **Tenant ID** from the Overview page. You will need these for your Helm `values.yaml`.

---

## Step 2: Link Identity to AKS Node Pool (VMSS)

AKS nodes run on a Virtual Machine Scale Set. You must tell Azure that these virtual machines are allowed to use the identity you just created.

1.  In the Azure Portal search bar, type **"Resource groups"** and select it.
2.  Find the **auto-generated** node resource group for your AKS cluster. 
    *   *Note: It usually looks like `MC_Mahesh-RG_Mahesh-AKS_eastus`.*
3.  Inside this resource group, find the resource of type **Virtual machine scale set** (it will have a long name ending in `vmss`). Click on it.
4.  In the left-hand sidebar, under the **Settings** section, click on **Identity**.
5.  Click on the **User assigned** tab.
6.  Click **+ Add**.
7.  In the panel that appears, select your subscription, then select the **`Mahesh-AKS-uami`** identity you created in Step 1.
8.  Click **Add**.

---

## Step 3: Grant Key Vault Access (RBAC)

Now you must give the identity permission to actually read the secrets inside your Key Vault.

1.  In the Azure Portal search bar, type **"Key vaults"** and select yours (`Mahesh-KeyV`).
2.  In the left-hand sidebar, click on **Access control (IAM)**.
3.  Click **+ Add** > **Add role assignment**.
4.  **Role**: Search for and select **"Key Vault Secrets User"**. Click **Next**.
5.  **Assign access to**: Select **"Managed identity"**.
6.  Click **+ Select members**.
7.  Select your subscription, then select **"User-assigned managed identity"** in the dropdown.
8.  Find and select **`Mahesh-AKS-uami`**. Click **Select**.
9.  Click **Review + assign**.

---

## Step 4: Add Secrets to Key Vault

Ensure the following secrets exist in your Key Vault so the microservices can start:

1.  Go to `Mahesh-KeyV` > **Secrets**.
2.  Click **+ Generate/Import**.
3.  Create the following secrets (names must match the `objects` list in `secret-provider.yaml`):
    *   `jwt-secret`
    *   `internal-secret`
    *   `storage-key`
    *   `groq-api-key`
    *   `cosmos-connection-string`

---

## Step 5: Update Helm Values

1.  Open `helm-chart/values.yaml` in your editor.
2.  Update the `global.azure` section with the IDs you copied in Step 1:
    ```yaml
    global:
      azure:
        tenantId: "d8537334-bc24-4daf-95a8-bf4c9fb14394"        # Your Tenant ID
        keyvaultName: "Mahesh-KeyV"
        identityClientId: "f1341b89-0c9a-439c-9fda-81defd6d5672" # Your Client ID
    ```

---

## Step 6: Deploy

Finally, run the deployment from your terminal:

```bash
cd helm-chart
helm upgrade --install organization .
```

You can now verify the pods are running and secrets are sync'd:
```bash
kubectl get pods
kubectl get secrets
```
