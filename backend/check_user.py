from database import get_db
from dotenv import load_dotenv

load_dotenv()

def check_user(user_id):
    db = get_db()
    tables = [
        "users",
        "products",
        "warehouses",
        "inventory",
        "manufacturing_runs",
        "purchase_orders",
        "sales_history",
        "suppliers"
    ]
    
    print(f"Database counts for User ID: {user_id}")
    for t in tables:
        try:
            if t == "users":
                res = db.table(t).select("*", count="exact").eq("id", user_id).execute()
            else:
                res = db.table(t).select("*", count="exact").eq("user_id", user_id).execute()
            count = res.count if hasattr(res, "count") else len(res.data)
            print(f"Table '{t}': {count} rows")
        except Exception as e:
            print(f"Table '{t}': Error: {e}")

if __name__ == "__main__":
    import sys
    uid = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    check_user(uid)
