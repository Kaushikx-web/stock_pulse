"""
Shared authentication dependency for FastAPI routers.
Extracts the logged-in user's ID from the Authorization header
so every router can scope queries to that user only.
"""
import hashlib
from functools import lru_cache
from typing import Optional
from fastapi import Depends, Header, HTTPException
from supabase import Client
from database import get_db


def hash_password(password: str) -> str:
    salt = "stockpulse_salt_token_99x"
    return hashlib.sha256((password + salt).encode()).hexdigest()


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Client = Depends(get_db),
) -> dict:
    """
    FastAPI dependency — validates the Bearer token (username) and returns
    the full user row: { id, username, email }.
    Raises HTTP 401 if missing / invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization header missing or malformed.")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(401, "Empty bearer token.")

    try:
        res = db.table("users").select("id, username, email").eq("username", token).execute()
    except Exception as e:
        if "PGRST205" in str(e) or "users" in str(e).lower():
            raise HTTPException(
                503,
                "The 'users' table is missing. Run the auth SQL setup in Supabase SQL Editor."
            )
        raise HTTPException(500, f"Auth lookup failed: {e}")

    if not res.data:
        raise HTTPException(401, "Invalid or expired session. Please log in again.")

    return res.data[0]   # { id, username, email }


def get_user_id(user: dict = Depends(get_current_user)) -> int:
    """Shortcut dependency that returns only the integer user_id."""
    return user["id"]
