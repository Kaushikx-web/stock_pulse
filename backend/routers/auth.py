import hashlib
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, EmailStr
from supabase import Client
from database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

# ─── Pydantic schemas ──────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: str

class UserDirectoryItem(BaseModel):
    username: str
    email: str
    created_at: str

# ─── Helpers ───────────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    salt = "stockpulse_salt_token_99x"
    return hashlib.sha256((password + salt).encode()).hexdigest()

def _table_missing_message() -> str:
    return (
        "The 'users' table does not exist in your Supabase database. "
        "Please run the Users Table SQL setup in Supabase SQL Editor. "
        "See System Settings page for the required SQL query."
    )

# ─── Routes ───────────────────────────────────────────────────────────────────
def clear_user_data(db: Client, user_id: int):
    """Delete all user-scoped data to ensure dashboard starts at zero."""
    tables = [
        "purchase_orders",
        "manufacturing_runs",
        "sales_history",
        "inventory",
        "products",
        "suppliers"
    ]
    for table in tables:
        try:
            db.table(table).delete().eq("user_id", user_id).execute()
        except Exception as e:
            print(f"[WARN] Failed to clear table {table} for user {user_id}: {e}")

@router.post("/register", response_model=UserOut, status_code=201)
def register(user: UserRegister, db: Client = Depends(get_db)):
    try:
        # Check username
        res_user = db.table("users").select("id").eq("username", user.username).execute()
        if res_user.data:
            raise HTTPException(400, "Username already taken. Please choose another.")

        # Check email
        res_email = db.table("users").select("id").eq("email", user.email).execute()
        if res_email.data:
            raise HTTPException(400, "Email already registered. Try signing in instead.")

        # Insert new user
        new_user = {
            "username": user.username,
            "email": user.email,
            "password_hash": hash_password(user.password),
        }
        res = db.table("users").insert(new_user).execute()
        if not res.data:
            raise HTTPException(500, "Registration failed — no data returned.")

        u = res.data[0]

        # Make sure user-scoped data is zero in dashboard section
        clear_user_data(db, u["id"])

        return {
            "id": u["id"],
            "username": u["username"],
            "email": u["email"],
            "created_at": str(u["created_at"]),
        }

    except HTTPException:
        raise
    except Exception as e:
        err_str = str(e)
        if "PGRST205" in err_str or "users" in err_str.lower():
            raise HTTPException(503, _table_missing_message())
        raise HTTPException(500, f"Registration error: {err_str}")


@router.post("/login")
def login(credentials: UserLogin, db: Client = Depends(get_db)):
    try:
        # Find by username or email
        res = db.table("users").select("*").or_(
            f"username.eq.{credentials.username_or_email},"
            f"email.eq.{credentials.username_or_email}"
        ).execute()

        if not res.data:
            raise HTTPException(400, "Invalid username/email or password.")

        user = res.data[0]
        if user["password_hash"] != hash_password(credentials.password):
            raise HTTPException(400, "Invalid username/email or password.")

        # Make sure user-scoped data is zero in dashboard section upon login
        clear_user_data(db, user["id"])

        return {
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
            },
            "token": user["username"],
        }

    except HTTPException:
        raise
    except Exception as e:
        err_str = str(e)
        if "PGRST205" in err_str or "users" in err_str.lower():
            raise HTTPException(503, _table_missing_message())
        raise HTTPException(500, f"Login error: {err_str}")


@router.get("/users", response_model=List[UserDirectoryItem])
def get_registered_users(db: Client = Depends(get_db)):
    """Return all registered user accounts for the System Settings directory."""
    try:
        res = db.table("users").select("username,email,created_at").order(
            "created_at", desc=True
        ).execute()
        return res.data
    except Exception as e:
        err_str = str(e)
        if "PGRST205" in err_str or "users" in err_str.lower():
            raise HTTPException(503, _table_missing_message())
        raise HTTPException(500, f"Failed to fetch users: {err_str}")
