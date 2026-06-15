import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PORT: int = int(os.getenv("PORT", "8001"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    # MongoDB
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "organistation_auth")

    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET")
    if not JWT_SECRET:
        raise ValueError("CRITICAL ERROR: JWT_SECRET environment variable is missing.")
    
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRY_MINUTES: int = int(os.getenv("JWT_ACCESS_EXPIRY_MINUTES", "15"))
    JWT_REFRESH_EXPIRY_DAYS: int = int(os.getenv("JWT_REFRESH_EXPIRY_DAYS", "7"))

    # Downstream services for cascade delete on user removal
    HR_SERVICE_URL: str = os.getenv("HR_SERVICE_URL", "http://localhost:8002")
    PROJECT_SERVICE_URL: str = os.getenv("PROJECT_SERVICE_URL", "http://localhost:8003")
    FINANCE_SERVICE_URL: str = os.getenv("FINANCE_SERVICE_URL", "http://localhost:8004")
    
    INTERNAL_SERVICE_SECRET: str = os.getenv("INTERNAL_SERVICE_SECRET")
    if not INTERNAL_SERVICE_SECRET:
        raise ValueError("CRITICAL ERROR: INTERNAL_SERVICE_SECRET environment variable is missing.")


settings = Settings()
