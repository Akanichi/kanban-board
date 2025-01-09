from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database settings
    DATABASE_URL: str = "sqlite:///./kanban.db"
    
    # JWT settings
    SECRET_KEY: str = "your-secret-key-here"  # In production, use a secure secret key
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS settings
    CORS_ORIGINS: list = ["http://localhost:5173"]  # Add your frontend URL
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings() 