# Test OrganiStation on an Azure VM (Docker)

Step-by-step guide to build all Docker images on a Linux Azure VM and run the full application with Docker Compose.

**Time:** ~30–45 minutes (first build downloads images and installs Python/Node deps).

---

## What you will run

| Container | Port (internal) | Public |
|-----------|-----------------|--------|
| MongoDB | 27017 | No |
| Auth | 8001 | No |
| AI | 8000 | No |
| HR | 8002 | No |
| Projects | 8003 | No |
| Finance | 8004 | No |
| **Gateway** | 3000 | **Yes — open in browser** |

The gateway serves the React UI from `gateway/public/` and proxies `/api/*` to backend services.

---

## Step 1 — Prepare the Azure VM

### 1.1 VM requirements

| Setting | Recommendation |
|---------|----------------|
| OS | Ubuntu 22.04 LTS |
| Size | Standard **B2s** or larger (2 vCPU, 4 GB RAM minimum) |
| Disk | 30 GB+ |

### 1.2 Open network port (Azure Portal)

1. Go to your VM → **Networking** (or the NSG attached to the VM NIC).
2. Add an **Inbound port rule**:
   - Port: **3000**
   - Protocol: TCP
   - Source: your IP (for testing) or `Any` (less secure)
   - Action: Allow
3. Keep port **22** open for SSH.

### 1.3 Connect via SSH

```bash
ssh azureuser@<VM_PUBLIC_IP>
```

Replace `azureuser` and IP with your VM username and public IP.

---

## Step 2 — Install Docker on the VM

```bash
# Update packages
sudo apt-get update
sudo apt-get install -y ca-certificates curl git

# Add Docker official repo
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow your user to run docker without sudo
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

---

## Step 3 — Get the code onto the VM

### Option A — Git clone (if repo is on GitHub)

```bash
cd ~
git clone https://github.com/<your-org>/<your-repo>.git organistation
cd organistation
```

### Option B — Copy from your PC (if not pushed to Git)

On your **local Windows machine** (PowerShell):

```powershell
scp -r C:\Users\91994\Desktop\anu-ai azureuser@<VM_PUBLIC_IP>:~/organistation
```

On the VM:

```bash
cd ~/organistation
```

---

## Step 4 — Configure environment variables

Create the root `.env` file used by Docker Compose:

```bash
cd ~/organistation
cp .env.example .env
nano .env
```

Set at minimum:

```env
JWT_SECRET=my-strong-secret-for-vm-testing-2026
GEMINI_API_KEY=your-gemini-key-here
```

| Variable | Required? | Notes |
|----------|-----------|-------|
| `JWT_SECRET` | **Yes** | Any long random string; shared by gateway + auth |
| `GEMINI_API_KEY` | Optional | [Google AI Studio](https://aistudio.google.com/) — enables real AI |
| `GROQ_API_KEY` | Optional | Alternative to Gemini |

**Do not put API keys in Dockerfiles.** They are injected at container start from `.env`.

---

## Step 5 — (Optional) Rebuild the frontend into the gateway

The repo includes a pre-built UI in `gateway/public/`. Skip this step unless you changed `frontend/`.

On the VM (requires Node.js):

```bash
# Install Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

cd ~/organistation/frontend
npm ci
npm run build
cp -r dist/* ../gateway/public/
```

---

## Step 6 — Build and start all containers

From the repo root:

```bash
cd ~/organistation
docker compose up --build -d
```

First build takes **10–20 minutes** (Python deps, especially AI service with ChromaDB).

### Watch progress

```bash
# Build logs (if still building)
docker compose logs -f

# Container status
docker compose ps
```

All services should show `running` (or `healthy` for mongo).

---

## Step 7 — Verify the application

### 7.1 Health check

```bash
curl http://localhost:3000/api/health
```

Expected:

```json
{"status":"healthy","service":"gateway","timestamp":"..."}
```

### 7.2 Login test

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@organistation.com","password":"Admin@123"}'
```

Expected: JSON with `access_token` and `refresh_token`.

### 7.3 Open in browser

On your PC, open:

```
http://<VM_PUBLIC_IP>:3000
```

Login:

| Field | Value |
|-------|-------|
| Email | `admin@organistation.com` |
| Password | `Admin@123` |

### 7.4 Check individual service logs

```bash
docker compose logs auth --tail 50
docker compose logs ai --tail 50
docker compose logs gateway --tail 50
```

---

## Step 8 — Useful commands

```bash
# Stop everything
docker compose down

# Stop and remove volumes (deletes MongoDB + Chroma data)
docker compose down -v

# Rebuild one service after code change
docker compose up --build -d auth

# Rebuild all
docker compose up --build -d

# Shell into a container
docker compose exec auth sh
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **Cannot open `http://VM_IP:3000` in browser** | Check Azure NSG allows inbound TCP 3000; confirm `docker compose ps` shows gateway on `0.0.0.0:3000` |
| **`502 Bad Gateway` from API** | Backend not ready — `docker compose logs auth`; wait for mongo healthcheck |
| **Login returns 401/403** | `JWT_SECRET` mismatch — only set it in root `.env`; rebuild with `docker compose up --build -d` |
| **Auth crashes on startup** | Mongo not ready — `docker compose logs mongo`; ensure mongo is healthy |
| **AI build fails** (chromadb/numpy) | VM may need more RAM; try `Standard_B2ms` (8 GB). Or build AI image alone: `docker compose build ai` and read error |
| **AI works but answers are poor** | No `GEMINI_API_KEY` — service uses offline fallback; add key to `.env` and `docker compose up -d ai` |
| **`permission denied` on docker** | Run `sudo usermod -aG docker $USER` and log out/in |
| **Port 3000 already in use** | Change in `docker-compose.yml`: `"8080:3000"` and open port 8080 in NSG |

### AI service build note

The AI image installs `chromadb` and `numpy`. On small VMs the build can be slow or fail. If it fails:

```bash
docker compose build ai 2>&1 | tee ai-build.log
```

Increase VM size to **B2ms** (8 GB RAM) and retry.

---

## Architecture on the VM

```text
Browser → VM:3000 → gateway
                      ├── auth      → mongo
                      ├── hr        → mongo
                      ├── projects  → mongo
                      ├── finance   → mongo
                      └── ai        → chroma volume (local)
```

---

## Security reminders (VM testing)

- Change the default admin password after first login.
- Restrict NSG port 3000 to your IP, not `0.0.0.0/0`, when possible.
- Do not commit `.env` to Git.
- This setup is for **testing** — for production use Container Apps, Cosmos DB, and Key Vault (see `AZURE_PRODUCTION_GUIDE.md`).

---

## Next steps after VM testing

1. Push images to Azure Container Registry.
2. Replace VM + Compose with Azure Container Apps (see `AZURE_DEPLOYMENT.md`).
3. Replace local MongoDB with Cosmos DB.
4. Migrate AI to Microsoft Foundry (see `AZURE_PRODUCTION_GUIDE.md`).
