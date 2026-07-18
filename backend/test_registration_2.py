import requests

def test_registration():
    url = "http://localhost:8000/auth/register"
    payload = {
        "username": "test_user_seed_98",
        "email": "test_user_seed_98@gmail.com",
        "password": "password123"
    }
    
    print("Sending registration request...")
    try:
        response = requests.post(url, json=payload)
        print("Response status code:", response.status_code)
        print("Response body:", response.json())
    except Exception as e:
        print("Error testing registration:", e)

if __name__ == "__main__":
    test_registration()
