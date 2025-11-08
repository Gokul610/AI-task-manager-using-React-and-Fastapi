# backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- MODIFIED IMPORT ---
from .api import auth_router, task_router, insights_router, ai_tools_router, gamification_router, summary_router
# ---------------------

app = FastAPI(
    title="AI Task Manager API",
    description="The backend API for the AI-Powered Task Management System.",
    version="0.1.0"
)

# --- Define our origins ---
allowed_origins = [
    "http://localhost:3000", # The default React port
    "http://localhost:5173", # The port from your old .env
    "http://localhost",
]

# --- Add the CORSMiddleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# --- Include Routers ---
app.include_router(auth_router.router)
app.include_router(task_router.router)
app.include_router(insights_router.router)
app.include_router(ai_tools_router.router)
app.include_router(gamification_router.router) 
app.include_router(summary_router.router) # <-- NEW ROUTER INCLUDED
# ------------------------


@app.get("/", tags=["Root"])
async def read_root():
    """
    A simple root endpoint to confirm the API is running.
    """
    return {"message": "Welcome to the AI Task Manager API! 🚀"}