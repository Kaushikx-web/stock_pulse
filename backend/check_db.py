from database import get_db
from dotenv import load_dotenv

load_dotenv()

def check_db():
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
    
    print("Database counts:")
    for t in tables:
        try:
            res = db.table(t).select("*", count="exact").execute()
            count = res.count if hasattr(res, "count") else len(res.data)
            
            # check user_id if column exists
            sample = res.data[0] if res.data else {}
            has_user_id = "user_id" in sample
            
            null_user_count = 0
            not_null_user_count = 0
            if has_user_id and res.data:
                null_user_count = sum(1 for r in res.data if r.get("user_id") is None)
                not_null_user_count = sum(1 for r in res.data if r.get("user_id") is not None)
                
            print(f"Table '{t}': {count} total rows. Has user_id: {has_user_id} (Null user_id: {null_user_count}, Not-Null user_id: {not_null_user_count})")
        except Exception as e:
            print(f"Table '{t}': Error: {e}")

if __name__ == "__main__":
    check_db()
