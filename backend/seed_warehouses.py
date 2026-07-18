import os
from database import get_db
from dotenv import load_dotenv

load_dotenv()

def seed_warehouses():
    db = get_db()
    
    # Check if warehouses are already seeded
    existing = db.table("warehouses").select("id").limit(1).execute()
    if existing.data:
        print("Warehouses table already contains data. Skipping.")
        return

    # Check if user_id column exists and get a user ID to associate if needed (or keep it None/null)
    # We will try to fetch the first user from the users table
    user_id = None
    try:
        users = db.table("users").select("id").limit(1).execute()
        if users.data:
            user_id = users.data[0]["id"]
    except Exception as e:
        print("Could not query users table:", e)

    warehouses = [
        {"name": "WH-01", "location": "Main Facility", "user_id": user_id},
        {"name": "WH-02", "location": "Secondary Facility", "user_id": user_id},
        {"name": "WH-03", "location": "Overflow Storage", "user_id": user_id}
    ]

    try:
        res = db.table("warehouses").insert(warehouses).execute()
        print("Successfully seeded warehouses:", res.data)
    except Exception as e:
        print("Error seeding warehouses:", e)

if __name__ == "__main__":
    seed_warehouses()
