"""
Debug script - tests the upload flow end-to-end via HTTP.
Run from the backend folder:
  python debug_upload.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import httpx, json

BASE = "http://localhost:8000"

# 1. Login (use your actual credentials)
USERNAME = input("Enter your username: ").strip()
PASSWORD = input("Enter your password: ").strip()

login_res = httpx.post(f"{BASE}/auth/login", json={"username_or_email": USERNAME, "password": PASSWORD})
print("\n--- LOGIN ---")
print(login_res.status_code, login_res.text[:300])

if login_res.status_code != 200:
    print("Login failed. Check credentials.")
    sys.exit(1)

token = login_res.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Check what tables exist and have user_id columns
from database import get_db
db = get_db()

print("\n--- CHECKING DB COLUMNS ---")
tables = ["products", "suppliers", "inventory", "sales_history", "manufacturing_runs"]
for t in tables:
    try:
        res = db.table(t).select("*").limit(0).execute()
        print(f"  {t}: OK (accessible)")
    except Exception as e:
        print(f"  {t}: ERROR - {e}")

# 3. Try inserting a dummy product directly to test user_id column
print("\n--- TEST INSERT: products table ---")
uid = login_res.json()["user"]["id"]
print(f"  User ID: {uid}")

try:
    test_row = {
        "name": "__debug_test_product__",
        "category": "Test",
        "unit_cost": 1.0,
        "unit_price": 2.0,
        "user_id": uid
    }
    ins = db.table("products").insert(test_row).execute()
    print(f"  INSERT OK: {ins.data}")
    
    # Clean up test row
    db.table("products").delete().eq("name", "__debug_test_product__").eq("user_id", uid).execute()
    print("  Cleanup done.")
except Exception as e:
    print(f"  INSERT FAILED: {e}")
    print("\n  >>> The 'user_id' column is likely missing from the 'products' table.")
    print("  >>> Please run migration 002_add_user_id.sql in Supabase SQL Editor.")
