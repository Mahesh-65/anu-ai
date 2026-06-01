from motor.motor_asyncio import AsyncIOMotorClient
from src.config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_to_mongo():
    """Initialize MongoDB connection using Motor async driver."""
    global client, db
    print(f"[Auth Service] Connecting to MongoDB at {settings.MONGODB_URI}...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DB_NAME]

    # Create indexes for performance
    await db.users.create_index("email", unique=True)
    await db.refresh_tokens.create_index("token", unique=True)
    await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.roles.create_index("name", unique=True)
    await db.permissions.create_index("name", unique=True)

    print(f"[Auth Service] Connected to MongoDB database: {settings.DB_NAME}")


async def close_mongo_connection():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()
        print("[Auth Service] MongoDB connection closed.")


def get_db():
    """Return the database instance."""
    return db


def get_collection(name: str):
    """Return a specific collection by name."""
    return db[name]
