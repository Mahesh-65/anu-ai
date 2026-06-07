from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.database import connect_to_mongo, close_mongo_connection
from src.utils.seeder import seed_database
from src.routes import auth, users, roles

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to MongoDB
    await connect_to_mongo()
    # Seed roles, permissions, and admin user
    await seed_database()
    yield
    # Close MongoDB connection
    await close_mongo_connection()

app = FastAPI(
    title="OrganiStation - Authentication & Authorization Service",
    description="Identity management, RBAC, and JWT tokens",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(roles.router)

@app.get("/")
@app.get("/health")
@app.get("/api/auth/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "auth-service",
        "database": "connected"
    }

if __name__ == "__main__":
    import uvicorn
    from src.config import settings
    uvicorn.run("app:app", host=settings.HOST, port=settings.PORT, reload=True)
