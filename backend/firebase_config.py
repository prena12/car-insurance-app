import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

load_dotenv()

# Try to initialize Firebase with real credentials
try:
    # Check if serviceAccountKey.json exists (preferred method)
    if os.path.exists('serviceAccountKey.json'):
        cred = credentials.Certificate('serviceAccountKey.json')
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✓ Firebase initialized with serviceAccountKey.json")
    else:
        # Try to use environment variables
        private_key = os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n')
        
        if private_key and os.getenv('FIREBASE_PROJECT_ID') and os.getenv('FIREBASE_CLIENT_EMAIL'):
            service_account = {
                "type": "service_account",
                "project_id": os.getenv('FIREBASE_PROJECT_ID'),
                "private_key_id": "key-id",
                "private_key": private_key,
                "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
                "client_id": "client-id",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
            cred = credentials.Certificate(service_account)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            print("✓ Firebase initialized with environment variables")
        else:
            raise ValueError("Missing Firebase credentials")
            
except Exception as e:
    print(f"⚠ Firebase initialization failed: {e}")
    print("Running in MOCK MODE - Firebase operations will not work")
    print("To fix this, add serviceAccountKey.json to the backend folder")
    # Create a mock db object for development
    db = None