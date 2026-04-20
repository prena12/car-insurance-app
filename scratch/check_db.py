import sqlite3
import os

db_path = os.path.join('backend', 'instance', 'car_insurance.db')
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- Users ---")
    try:
        cursor.execute("SELECT id, email, first_name, last_name, claim_number FROM users")
        users = cursor.fetchall()
        for u in users:
            print(u)
    except Exception as e:
        print(f"Error fetching users: {e}")
        
    print("\n--- Policies ---")
    try:
        cursor.execute("SELECT policy_number, user_name, email FROM policies")
        policies = cursor.fetchall()
        for p in policies:
            print(p)
    except Exception as e:
        print(f"Error fetching policies: {e}")
        
    conn.close()
else:
    print(f"Database not found at {db_path}")
