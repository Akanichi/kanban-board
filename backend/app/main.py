import warnings
warnings.filterwarnings("ignore", message="Pydantic serializer warnings")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging
from .database import engine, Base
from .routers import tasks, auth, teams
from .config import settings
from .utils.logging import debug_log, logger

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Kanban Board API")

# Configure CORS
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Mount the uploads directory
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Add request logging middleware
@app.middleware("http")
@debug_log
async def log_requests(request: Request, call_next):
    logger.debug(f"Request path: {request.url.path}")
    logger.debug(f"Request method: {request.method}")
    logger.debug(f"Request headers: {request.headers}")
    response = await call_next(request)
    logger.debug(f"Response status: {response.status_code}")
    return response

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(teams.router, prefix="/api/teams", tags=["teams"])

@app.on_event("startup")
@debug_log
async def startup_event():
    logger.info("Starting up FastAPI application")
    logger.debug(f"Database URL: {str(engine.url).replace(':password', ':***')}") 