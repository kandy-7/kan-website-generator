import requests
import json

DEVIKA_URL = "http://127.0.0.1:1337"
PROJECT_NAME = "test_connection"

def test_devika_connection():
    print(f"Testing connection to Devika at {DEVIKA_URL}...")
    try:
        # Try to get project list as a simple health check
        r = requests.get(f"{DEVIKA_URL}/api/data")
        if r.status_code == 200:
            print("SUCCESS: Connected to Devika API!")
            print(f"Projects: {r.json()}")
        else:
            print(f"FAILED: Devika returned status {r.status_code}")
    except Exception as e:
        print(f"ERROR: Could not connect to Devika. Is the server running? {e}")

if __name__ == "__main__":
    test_devika_connection()
