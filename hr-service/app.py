import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME     = os.getenv("DB_NAME", "anu_hr")
PORT        = int(os.getenv("PORT", "8002"))
HOST        = os.getenv("HOST", "0.0.0.0")

client: AsyncIOMotorClient = None
db = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global client, db
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    await db.employees.create_index("email", unique=True, sparse=True)
    await db.leave_requests.create_index("employee_id")
    await db.jobs.create_index("title")
    print(f"[HR Service] Connected to MongoDB: {DB_NAME}")
    yield
    client.close()

app = FastAPI(title="Anu AI – HR Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def oid(doc):
    doc["id"]  = str(doc["_id"])
    doc["_id"] = str(doc["_id"])
    return doc

# ── Schemas ────────────────────────────────────────────────────────────────────

class Employee(BaseModel):
    first_name:  str
    last_name:   str
    email:       Optional[str] = None
    department:  str = "Engineering"
    position:    Optional[str] = None
    phone:       Optional[str] = None
    hire_date:   Optional[str] = None
    salary:      Optional[float] = None
    status:      str = "active"

class LeaveRequest(BaseModel):
    employee_id: str
    type:        str = "annual"          # annual | sick | unpaid
    start_date:  str
    end_date:    str
    reason:      Optional[str] = None
    status:      str = "pending"

class LeaveUpdate(BaseModel):
    status: str   # approved | rejected

class Job(BaseModel):
    title:       str
    department:  str
    description: Optional[str] = None
    type:        str = "full_time"
    status:      str = "open"
    posted_date: Optional[str] = None

class Attendance(BaseModel):
    employee_id: str
    date:        str
    check_in:    Optional[str] = None
    check_out:   Optional[str] = None
    status:      str = "present"

# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/")
@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "hr-service"}

# ── Employees ──────────────────────────────────────────────────────────────────

@app.get("/api/employees")
async def list_employees():
    cur = db.employees.find()
    return [oid(e) async for e in cur]

@app.get("/api/employees/{eid}")
async def get_employee(eid: str):
    e = await db.employees.find_one({"_id": ObjectId(eid)})
    if not e: raise HTTPException(404, "Employee not found")
    return oid(e)

@app.post("/api/employees", status_code=201)
async def create_employee(emp: Employee):
    doc = emp.model_dump()
    doc["created_at"] = doc["updated_at"] = datetime.utcnow()
    r = await db.employees.insert_one(doc)
    doc["id"] = doc["_id"] = str(r.inserted_id)
    return doc

@app.put("/api/employees/{eid}")
async def update_employee(eid: str, emp: Employee):
    data = {k: v for k, v in emp.model_dump().items() if v is not None}
    data["updated_at"] = datetime.utcnow()
    await db.employees.update_one({"_id": ObjectId(eid)}, {"$set": data})
    e = await db.employees.find_one({"_id": ObjectId(eid)})
    if not e: raise HTTPException(404, "Employee not found")
    return oid(e)

@app.delete("/api/employees/{eid}")
async def delete_employee(eid: str):
    r = await db.employees.delete_one({"_id": ObjectId(eid)})
    if r.deleted_count == 0: raise HTTPException(404, "Employee not found")
    return {"message": "Employee deleted"}

# ── Attendance ─────────────────────────────────────────────────────────────────

@app.get("/api/employees/{eid}/attendance")
async def get_attendance(eid: str):
    cur = db.attendance.find({"employee_id": eid})
    return [oid(a) async for a in cur]

@app.post("/api/attendance", status_code=201)
async def log_attendance(a: Attendance):
    doc = a.model_dump()
    doc["created_at"] = datetime.utcnow()
    r = await db.attendance.insert_one(doc)
    doc["id"] = doc["_id"] = str(r.inserted_id)
    return doc

# ── Leave Requests ─────────────────────────────────────────────────────────────

@app.get("/api/leaves")
async def list_leaves():
    cur = db.leave_requests.find()
    return [oid(l) async for l in cur]

@app.post("/api/leaves", status_code=201)
async def create_leave(req: LeaveRequest):
    doc = req.model_dump()
    doc["created_at"] = datetime.utcnow()
    r = await db.leave_requests.insert_one(doc)
    doc["id"] = doc["_id"] = str(r.inserted_id)
    return doc

@app.put("/api/leaves/{lid}")
async def update_leave(lid: str, upd: LeaveUpdate):
    await db.leave_requests.update_one({"_id": ObjectId(lid)}, {"$set": {"status": upd.status, "updated_at": datetime.utcnow()}})
    doc = await db.leave_requests.find_one({"_id": ObjectId(lid)})
    if not doc: raise HTTPException(404, "Leave request not found")
    return oid(doc)

# ── Jobs / Recruitment ─────────────────────────────────────────────────────────

@app.get("/api/jobs")
async def list_jobs():
    cur = db.jobs.find()
    return [oid(j) async for j in cur]

@app.post("/api/jobs", status_code=201)
async def create_job(job: Job):
    doc = job.model_dump()
    doc["created_at"] = datetime.utcnow()
    r = await db.jobs.insert_one(doc)
    doc["id"] = doc["_id"] = str(r.inserted_id)
    return doc

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=HOST, port=PORT, reload=True)
