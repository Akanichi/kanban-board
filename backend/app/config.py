from pydantic import Field
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database settings
    DATABASE_URL: str = "sqlite:///./kanban.db"
    
    # JWT settings: deployments must provide a random secret of at least 32 characters.
    SECRET_KEY: str = Field(min_length=32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS settings
    CORS_ORIGINS: list = ["http://localhost:5173"]  # Add your frontend URL
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()  # type: ignore[call-arg] -- value is required from environment/.env

settings = get_settings() 