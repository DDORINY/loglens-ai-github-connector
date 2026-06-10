from app.routers import server_logs
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db.session import SessionLocal
from app.routers.analysis_reports import router as analysis_reports_router
from app.routers.auth import router as auth_router
from app.routers.github import router as github_router
from app.routers.projects import router as projects_router


app = FastAPI(
    title="LogLens AI GitHub Connector API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(github_router)
app.include_router(analysis_reports_router)
app.include_router(server_logs.router)


@app.get("/health")
def health_check():
    return {
        "success": True,
        "message": "LogLens API is running",
    }


@app.get("/db-health")
def db_health_check():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {
            "success": True,
            "message": "Database connection is healthy",
        }
    finally:
        db.close()
