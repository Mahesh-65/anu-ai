import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PORT: int = int(os.getenv("PORT", "8001"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    # MongoDB
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "anu_auth")

    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "default_secret_change_me")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRY_MINUTES: int = int(os.getenv("JWT_ACCESS_EXPIRY_MINUTES", "15"))
    JWT_REFRESH_EXPIRY_DAYS: int = int(os.getenv("JWT_REFRESH_EXPIRY_DAYS", "7"))


settings = Settings()
