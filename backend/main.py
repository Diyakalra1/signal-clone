import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
import models
from models import User
from database import SessionLocal

from routes.auth import router as auth_router
from routes.contacts import router as contacts_router
from routes.conversations import router as conversations_router
from routes.messages import router as messages_router
from routes.websocket import router as websocket_router


# =========================
# CREATE DATABASE TABLES
# =========================

Base.metadata.create_all(bind=engine)

# Optional one-time sample data for a fresh hosted database. This guard makes
# restarts safe after the first successful seed.
if os.getenv("SEED_DEMO_DATA", "false").lower() == "true":
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            from seed import seed_database

            seed_database()
    finally:
        db.close()


# =========================
# FASTAPI APP
# =========================

app = FastAPI(
    title="Signal Clone API"
)


# =========================
# CORS
# =========================

frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_origin_regex=os.getenv("FRONTEND_ORIGIN_REGEX") or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# =========================
# ROUTES
# =========================

app.include_router(auth_router)
app.include_router(contacts_router)
app.include_router(conversations_router)
app.include_router(messages_router)
app.include_router(websocket_router)


# =========================
# ROOT
# =========================

@app.get("/")
def root():
    return {
        "message": "Signal Clone Backend Running"
    }
