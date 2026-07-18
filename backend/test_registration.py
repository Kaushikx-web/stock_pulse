import requests

def test_registration():
    url = "http://localhost:8000/auth/register"
    payload = {
        "username": "test_user_seed_99",
        "email": "test_user_seed_99@gmail.com",
        "password": "password123"
    }
    
    print("Sending registration request...")
    try:
        response = requests.post(url, json=payload)
        print("Response status code:", response.status_code)
        print("Response body:", response.json())
        
        if response.status_code == 201:
            print("Registration and automatic seeding succeeded!")
            # Let's verify by querying the database for this new user's products
            user_id = response.json()["id"]
            print(f"Registered user has ID: {user_id}")
            
            # Let's check counts for this user
            from database import get_db
            db = get_db()
            
            counts = {}
            tables = ["products", "inventory", "suppliers", "purchase_orders", "sales_history", "manufacturing_runs", "warehouses"]
            for t in tables:
                res = db.table(t).select("*", count="exact").eq("user_id", user_id).execute()
                counts[t] = res.count if hasattr(res, "count") else len(res.data)
            print("Seeded data counts for the new user:")
            for t, c in counts.items():
                print(f"  {t}: {c}")
        else:
            print("Failed to register. Detail:", response.text)
            
    except Exception as e:
        print("Error testing registration:", e)

if __name__ == "__main__":
    test_registration()
