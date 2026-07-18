"""
StockPulse FastAPI Backend
AI-powered inventory, procurement, and profitability management platform.
Database: Supabase (Postgres) via supabase-py service role client.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import get_db
from routers import upload, products, inventory, suppliers, purchase_orders, analytics, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify Supabase connectivity on startup
    try:
        db = get_db()
        db.table("products").select("id").limit(1).execute()
        print("[OK] Supabase connection verified.")
    except Exception as e:
        print(f"[WARN] Supabase connection error: {e}")
        print("   Make sure SUPABASE_URL and SUPABASE_KEY are set in .env")
    yield


app = FastAPI(
    title="StockPulse API",
    description="AI-powered inventory, procurement, and profitability management",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React dev server only (never expose SUPABASE_KEY to browser)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(suppliers.router)
app.include_router(purchase_orders.router)
app.include_router(analytics.router)
app.include_router(auth.router)


@app.get("/", tags=["health"])
def health_check():
    return {
        "status":                    "online",
        "app":                       "StockPulse",
        "version":                   "1.0.0",
        "anthropic_key_configured":  bool(
            os.getenv("ANTHROPIC_API_KEY") and
            os.getenv("ANTHROPIC_API_KEY") != "your_anthropic_api_key_here"
        ),
        "supabase_configured": bool(
            os.getenv("SUPABASE_URL") and
            os.getenv("SUPABASE_KEY") and
            os.getenv("SUPABASE_URL") != "https://your-project-ref.supabase.co"
        ),
    }
