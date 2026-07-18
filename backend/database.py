"""
Supabase client initializer.
Reads SUPABASE_URL and SUPABASE_KEY (service role) from .env.
All backend routers import `get_db()` to get the client.
The service role key MUST never be sent to the frontend.
"""
import os
from functools import lru_cache
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


@lru_cache(maxsize=1)
def _get_client() -> Client:
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_KEY must be set in .env\n"
            "Copy .env.example to .env and fill in your credentials."
        )
    return create_client(url, key)


def get_db() -> Client:
    """FastAPI dependency — returns a shared Supabase client."""
    return _get_client()
