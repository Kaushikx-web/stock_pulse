from database import get_db
from dotenv import load_dotenv

load_dotenv()

def inspect_schema():
    db = get_db()
    try:
        # Query column names for all tables
        res = db.table("sales_history").select("id").limit(1).execute()
        print("Connected to sales_history")
    except Exception as e:
        print("Error connecting to sales_history:", e)
        
    # Let's inspect column names by looking at postgrest API or trying to insert a dummy row and catch error
    for table in ["products", "inventory", "suppliers", "purchase_orders", "sales_history", "manufacturing_runs"]:
        try:
            # We insert an invalid row or do a select to see if we can find column names
            # Alternatively, we can query information_schema via a postgrest RPC if exists, or try selecting a non-existent column
            # Let's try to select 'user_id' from the table. If it succeeds, the column exists!
            res = db.table(table).select("user_id").limit(1).execute()
            print(f"Table '{table}' HAS user_id column.")
        except Exception as e:
            if "column" in str(e).lower() and "does not exist" in str(e).lower():
                print(f"Table '{table}' does NOT have user_id column. Error: {e}")
            else:
                print(f"Table '{table}' error when checking user_id: {e}")

if __name__ == "__main__":
    inspect_schema()
