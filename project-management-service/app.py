import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME     = os.getenv("DB_NAME", "organistation_projects")
PORT        = int(os.getenv("PORT", "8003"))
HOST        = os.getenv("HOST", "0.0.0.0")
INTERNAL_SERVICE_SECRET = os.getenv("INTERNAL_SERVICE_SECRET", "organistation_internal_secret")

client = None
db     = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global client, db
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    await db.projects.create_index("name")
    await db.tasks.create_index("project_id")
    await db.tickets.create_index("project_id")
    await db.milestones.create_index("project_id")
    print(f"[Project Service] Connected to MongoDB: {DB_NAME}")
    yield
    client.close()

app = FastAPI(title="OrganiStation – Project & Ticket Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def oid(doc):
    doc["id"] = doc["_id"] = str(doc["_id"])
    return doc

# ── Schemas ────────────────────────────────────────────────────────────────────

class Project(BaseModel):
    name:        str
    description: Optional[str] = None
    status:      str = "planning"
    priority:    str = "medium"
    start_date:  Optional[str] = None
    due_date:    Optional[str] = None
    owner:       Optional[str] = None

class Task(BaseModel):
    title:       str
    description: Optional[str] = None
    status:      str = "todo"
    priority:    str = "medium"
    assignee:    Optional[str] = None
    due_date:    Optional[str] = None

class TaskUpdate(BaseModel):
    title:       Optional[str] = None
    description: Optional[str] = None
    status:      Optional[str] = None
    priority:    Optional[str] = None
    assignee:    Optional[str] = None
    due_date:    Optional[str] = None

class Milestone(BaseModel):
    title:       str
    due_date:    Optional[str] = None
    completed:   bool = False

class Ticket(BaseModel):
    title:       str
    description: Optional[str] = None
    project_id:  Optional[str] = None
    priority:    str = "medium"
    status:      str = "open"
    reporter:    Optional[str] = None
    assignee:    Optional[str] = None

class TicketUpdate(BaseModel):
    title:       Optional[str] = None
    description: Optional[str] = None
    status:      Optional[str] = None
    priority:    Optional[str] = None
    assignee:    Optional[str] = None

class PurgeUserRequest(BaseModel):
    email:      str
    first_name: Optional[str] = None
    last_name:  Optional[str] = None

def _verify_internal(x_internal_secret: Optional[str]):
    if x_internal_secret != INTERNAL_SERVICE_SECRET:
        raise HTTPException(403, "Forbidden")

def _user_match(email: str, first_name: Optional[str], last_name: Optional[str]):
    values = [email]
    full_name = " ".join(part for part in [first_name, last_name] if part).strip()
    if full_name:
        values.append(full_name)
    return {"$in": values}

async def _delete_project_tree(pid: str):
    await db.tasks.delete_many({"project_id": pid})
    await db.milestones.delete_many({"project_id": pid})
    await db.tickets.delete_many({"project_id": pid})
    await db.projects.delete_one({"_id": ObjectId(pid)})

# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/")
@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "project-service"}

# ── Projects ───────────────────────────────────────────────────────────────────

@app.get("/api/projects")
async def list_projects():
    return [oid(p) async for p in db.projects.find()]

@app.get("/api/projects/{pid}")
async def get_project(pid: str):
    p = await db.projects.find_one({"_id": ObjectId(pid)})
    if not p: raise HTTPException(404, "Project not found")
    return oid(p)

@app.post("/api/projects", status_code=201)
async def create_project(proj: Project):
    doc = proj.model_dump()
    doc["created_at"] = doc["updated_at"] = datetime.utcnow()
    r = await db.projects.insert_one(doc)
    doc["id"] = doc["_id"] = str(r.inserted_id)
    return doc

@app.put("/api/projects/{pid}")
async def update_project(pid: str, proj: Project):
    data = {k: v for k, v in proj.model_dump().items() if v is not None}
    data["updated_at"] = datetime.utcnow()
    await db.projects.update_one({"_id": ObjectId(pid)}, {"$set": data})
    p = await db.projects.find_one({"_id": ObjectId(pid)})
    if not p: raise HTTPException(404, "Project not found")
    return oid(p)

@app.delete("/api/projects/{pid}")
async def delete_project(pid: str):
    r = await db.projects.delete_one({"_id": ObjectId(pid)})
    if r.deleted_count == 0: raise HTTPException(404, "Project not found")
    await db.tasks.delete_many({"project_id": pid})
    return {"message": "Project and its tasks deleted"}

# ── Tasks ──────────────────────────────────────────────────────────────────────

@app.get("/api/projects/{pid}/tasks")
async def list_tasks(pid: str):
    return [oid(t) async for t in db.tasks.find({"project_id": pid})]

@app.post("/api/projects/{pid}/tasks", status_code=201)
async def create_task(pid: str, task: Task):
    doc = task.model_dump()
    doc["project_id"] = pid
    doc["created_at"] = doc["updated_at"] = datetime.utcnow()
    r = await db.tasks.insert_one(doc)
    doc["id"] = doc["_id"] = str(r.inserted_id)
    return doc

@app.put("/api/tasks/{tid}")
async def update_task(tid: str, upd: TaskUpdate):
    data = {k: v for k, v in upd.model_dump().items() if v is not None}
    data["updated_at"] = datetime.utcnow()
    await db.tasks.update_one({"_id": ObjectId(tid)}, {"$set": data})
    t = await db.tasks.find_one({"_id": ObjectId(tid)})
    if not t: raise HTTPException(404, "Task not found")
    return oid(t)

# ── Milestones ─────────────────────────────────────────────────────────────────

@app.get("/api/projects/{pid}/milestones")
async def list_milestones(pid: str):
    return [oid(m) async for m in db.milestones.find({"project_id": pid})]

@app.post("/api/projects/{pid}/milestones", status_code=201)
async def create_milestone(pid: str, ms: Milestone):
    doc = ms.model_dump()
    doc["project_id"] = pid
    doc["created_at"] = datetime.utcnow()
    r = await db.milestones.insert_one(doc)
    doc["id"] = doc["_id"] = str(r.inserted_id)
    return doc

# ── Tickets ────────────────────────────────────────────────────────────────────

@app.get("/api/tickets")
async def list_tickets():
    return [oid(t) async for t in db.tickets.find()]

@app.post("/api/tickets", status_code=201)
async def create_ticket(ticket: Ticket):
    doc = ticket.model_dump()
    doc["created_at"] = doc["updated_at"] = datetime.utcnow()
    r = await db.tickets.insert_one(doc)
    doc["id"] = doc["_id"] = str(r.inserted_id)
    return doc

@app.put("/api/tickets/{tid}")
async def update_ticket(tid: str, upd: TicketUpdate):
    data = {k: v for k, v in upd.model_dump().items() if v is not None}
    data["updated_at"] = datetime.utcnow()
    await db.tickets.update_one({"_id": ObjectId(tid)}, {"$set": data})
    t = await db.tickets.find_one({"_id": ObjectId(tid)})
    if not t: raise HTTPException(404, "Ticket not found")
    return oid(t)

@app.delete("/api/tickets/{tid}")
async def delete_ticket(tid: str):
    r = await db.tickets.delete_one({"_id": ObjectId(tid)})
    if r.deleted_count == 0: raise HTTPException(404, "Ticket not found")
    return {"message": "Ticket deleted"}

@app.post("/api/internal/purge-user")
async def purge_user(
    body: PurgeUserRequest,
    x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret"),
):
    _verify_internal(x_internal_secret)
    match = _user_match(body.email, body.first_name, body.last_name)

    projects_deleted = 0
    async for project in db.projects.find({"owner": match}):
        await _delete_project_tree(str(project["_id"]))
        projects_deleted += 1

    tasks_deleted = (await db.tasks.delete_many({"assignee": match})).deleted_count
    tickets_deleted = (await db.tickets.delete_many({
        "$or": [{"assignee": match}, {"reporter": match}]
    })).deleted_count

    return {
        "projects_deleted": projects_deleted,
        "tasks_deleted": tasks_deleted,
        "tickets_deleted": tickets_deleted,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=HOST, port=PORT, reload=True)
