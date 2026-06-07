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
DB_NAME     = os.getenv("DB_NAME", "organistation_hr")
PORT        = int(os.getenv("PORT", "8002"))
HOST        = os.getenv("HOST", "0.0.0.0")
INTERNAL_SERVICE_SECRET = os.getenv("INTERNAL_SERVICE_SECRET", "organistation_internal_secret")

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

app = FastAPI(title="OrganiStation – HR Service", version="1.0.0", lifespan=lifespan)
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

class PurgeUserRequest(BaseModel):
    email:      str
    first_name: Optional[str] = None
    last_name:  Optional[str] = None

def _verify_internal(x_internal_secret: Optional[str]):
    if x_internal_secret != INTERNAL_SERVICE_SECRET:
        raise HTTPException(403, "Forbidden")

async def _delete_employee_records(eid: str):
    await db.attendance.delete_many({"employee_id": eid})
    await db.leave_requests.delete_many({"employee_id": eid})
    result = await db.employees.delete_one({"_id": ObjectId(eid)})
    return result.deleted_count

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
    employee = await db.employees.find_one({"_id": ObjectId(eid)})
    if not employee:
        raise HTTPException(404, "Employee not found")
    await _delete_employee_records(eid)
    return {"message": "Employee and related HR data deleted"}

@app.post("/api/internal/purge-user")
async def purge_user(
    body: PurgeUserRequest,
    x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret"),
):
    _verify_internal(x_internal_secret)
    employee = await db.employees.find_one({"email": body.email})
    if not employee:
        return {"employees_deleted": 0, "attendance_deleted": 0, "leaves_deleted": 0}

    eid = str(employee["_id"])
    attendance_deleted = (await db.attendance.delete_many({"employee_id": eid})).deleted_count
    leaves_deleted = (await db.leave_requests.delete_many({"employee_id": eid})).deleted_count
    employees_deleted = (await db.employees.delete_one({"_id": employee["_id"]})).deleted_count
    return {
        "employees_deleted": employees_deleted,
        "attendance_deleted": attendance_deleted,
        "leaves_deleted": leaves_deleted,
    }

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
