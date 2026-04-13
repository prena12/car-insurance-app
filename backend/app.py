from flask import Flask, request, jsonify, g
from flask_cors import CORS
import os
from dotenv import load_dotenv
from datetime import datetime
import secrets
import string

from database import db, init_db
from models import User, Claim, Notification
from auth import (
    hash_password, verify_password, generate_token,
    token_required, get_current_user, authenticate_user,
    verify_token
)
from ml_service import process_damage_assessment

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///./car_insurance.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-this')

CORS(app,
     resources={r"/api/*": {"origins": "*"}},
     allow_headers=["Content-Type", "Authorization"],
     expose_headers=["Authorization"],
     supports_credentials=True
)

# Initialize database
init_db(app)


def generate_claim_number() -> str:
    """Generate a sequential claim number in format CLM-XX"""
    # Get the highest existing claim number
    last_claim = Claim.query.order_by(Claim.id.desc()).first()
    if last_claim and last_claim.claim_number and last_claim.claim_number.startswith('CLM-'):
        try:
            # Extract the number part and increment
            number_part = last_claim.claim_number.split('-')[1]
            next_number = int(number_part) + 1
        except (ValueError, IndexError):
            next_number = 1
    else:
        next_number = 1
    
    # Format with leading zeros (2 digits)
    return f"CLM-{next_number:02d}"


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'API is running'}), 200


@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """User registration endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email')
        password = data.get('password')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        
        if not all([email, password, first_name, last_name]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create new user
        hashed_password = hash_password(password)
        new_user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            hashed_password=hashed_password
        )
        
        db.session.add(new_user)
        db.session.commit()
        db.session.refresh(new_user)
        
        # Auto-assign claim number on signup
        claim_number = generate_claim_number()
        new_user.claim_number = claim_number
        db.session.commit()
        
        # Create signup notification
        notification = Notification(
            user_id=new_user.id,
            message=f"Welcome to IntelliClaim, {new_user.first_name}! Your account has been created successfully.",
            notification_type="Login" # Reusing Login type for welcome messages
        )
        db.session.add(notification)
        db.session.commit()
        
        # Generate token
        token = generate_token(new_user.id, new_user.email)
        
        return jsonify({
            'access_token': token,
            'token_type': 'bearer',
            'user': {
                'id': new_user.id,
                'email': new_user.email,
                'first_name': new_user.first_name,
                'last_name': new_user.last_name,
                'claim_number': new_user.claim_number
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        # Authenticate user
        user = authenticate_user(email, password)
        if not user:
            return jsonify({'error': 'Incorrect email or password'}), 401
        
        # Auto-assign claim number if user doesn't have one (first login)
        if not user.claim_number:
            claim_number = generate_claim_number()
            user.claim_number = claim_number
            db.session.commit()
        # Create login notification
        from datetime import datetime
        last_login_notif = Notification.query.filter_by(user_id=user.id, notification_type="Login").order_by(Notification.created_at.desc()).first()
        
        # Reduced throttle for testing/better UX: only suppress if last login was < 1 minute ago
        should_notify = True
        if last_login_notif and last_login_notif.created_at:
            delta = datetime.utcnow() - last_login_notif.created_at
            if delta.total_seconds() < 60:
                should_notify = False
                
        if should_notify:
            notification = Notification(
                user_id=user.id,
                message=f"Welcome back, {user.first_name or 'User'}! You have successfully logged in.",
                notification_type="Login"
            )
            db.session.add(notification)
            db.session.commit()
            
        # Generate token
        token = generate_token(user.id, user.email)
        
        return jsonify({
            'access_token': token,
            'token_type': 'bearer',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'claim_number': user.claim_number
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user_info():
    """Get current authenticated user information"""
    user = get_current_user()
    return jsonify(user.to_dict()), 200


@app.route('/api/claims', methods=['POST'])
def create_claim():
    """Create a new claim"""
    try:
        user = None
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Attempt to authenticate with bearer token if present
        auth_header = request.headers.get('Authorization')
        print(f"🔐 Auth header: {auth_header}")
        
        if auth_header:
            token_parts = auth_header.split(' ')
            if len(token_parts) == 2 and token_parts[0].lower() == 'bearer':
                payload = verify_token(token_parts[1])
                print(f"✅ Token payload: {payload}")
                if payload:
                    user = User.query.filter_by(id=payload['user_id']).first()
                    print(f"✅ User found by token: {user.email if user else 'Not found'}")

        # Fallback: use email from claim data if no valid token
        if user is None:
            email = data.get('email')
            print(f"📧 Using email from data: {email}")
            if email:
                user = User.query.filter_by(email=email).first()
                if not user:
                    print(f"👤 Creating new user for email: {email}")
                    generated_password = secrets.token_hex(16)
                    new_user = User(
                        email=email,
                        first_name=data.get('name', 'Guest'),
                        last_name='',
                        hashed_password=hash_password(generated_password)
                    )
                    db.session.add(new_user)
                    db.session.commit()
                    db.session.refresh(new_user)
                    user = new_user
            else:
                # Create an anonymous guest user to allow submission without login
                guest_email = f"guest_{secrets.token_hex(6)}@claims.local"
                print(f"👤 Creating guest user: {guest_email}")
                generated_password = secrets.token_hex(16)
                new_user = User(
                    email=guest_email,
                    first_name=data.get('name', 'Guest'),
                    last_name='',
                    hashed_password=hash_password(generated_password)
                )
                db.session.add(new_user)
                db.session.commit()
                db.session.refresh(new_user)
                user = new_user

        print(f"📝 Creating claim for user: {user.email} (ID: {user.id})")

        # Generate claim number if not provided
        claim_number = data.get('claim_number') or generate_claim_number()
        
        # Check if claim number already exists
        existing_claim = Claim.query.filter_by(claim_number=claim_number).first()
        if existing_claim:
            claim_number = generate_claim_number()
        
        # Helper function to parse datetime strings
        def parse_datetime(date_str):
            if not date_str:
                return None
            try:
                return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except:
                try:
                    return datetime.strptime(date_str, '%Y-%m-%d')
                except:
                    return None
        
        # Create new claim
        new_claim = Claim(
            user_id=user.id,
            claim_number=claim_number,
            status="Pending",  # Initial status
            policy_no=data.get('policy_no'),
            vehicle_make=data.get('vehicle_make'),
            policy_start_date=parse_datetime(data.get('policy_start_date')),
            claim_count=data.get('claim_count'),
            engine=data.get('engine'),
            policy_end_date=parse_datetime(data.get('policy_end_date')),
            claim_amount=data.get('claim_amount'),
            vehicle_color=data.get('vehicle_color'),
            vehicle_start_date=parse_datetime(data.get('vehicle_start_date')),
            deductible_amount=data.get('deductible_amount'),
            registration_no=data.get('registration_no'),
            year_of_manufacture=data.get('year_of_manufacture'),
            vehicle_end_date=parse_datetime(data.get('vehicle_end_date')),
            claim_type=data.get('claim_type'),
            branch=data.get('branch'),
            date_time=parse_datetime(data.get('date_time')),
            incident_place=data.get('incident_place'),
            current_location=data.get('current_location'),
            circumstances=data.get('circumstances'),
            missing_parts=data.get('missing_parts'),
            workshop_type=data.get('workshop_type'),
            vehicle_type=data.get('vehicle_type'),
            date_field=parse_datetime(data.get('date_field')),
            workshop_name=data.get('workshop_name'),
            vehicle_availability=data.get('vehicle_availability'),
            relation_with_insured=data.get('relation_with_insured', 'Self'),
            name=data.get('name'),
            contact=data.get('contact'),
            email=data.get('email'),
            remarks=data.get('remarks'),
            remarks2=data.get('remarks2'),
            documents_datetime=parse_datetime(data.get('documents_datetime'))
        )
        
        db.session.add(new_claim)
        db.session.commit()
        db.session.refresh(new_claim)
        
        # Create notification for pending claim
        notification = Notification(
            user_id=user.id,
            claim_id=new_claim.id,
            message=f"Your claim {claim_number} has been submitted and is now pending review.",
            notification_type="Pending"
        )
        db.session.add(notification)
        db.session.commit()
        
        return jsonify(new_claim.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/claims', methods=['GET'])
@token_required
def get_claims():
    """Get all claims for the current user"""
    try:
        user = get_current_user()
        print(f"📊 Fetching claims for user: {user.email} (ID: {user.id})")
        
        claims = Claim.query.filter_by(user_id=user.id).order_by(Claim.created_at.desc()).all()
        print(f"📊 Found {len(claims)} claims for user {user.email}")
        
        return jsonify([claim.to_dict() for claim in claims]), 200
    except Exception as e:
        print(f"❌ Error fetching claims: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/claims/user', methods=['GET'])
def get_claims_by_email():
    """Get all claims for a user by email (Fallback for Firebase users)"""
    try:
        email = request.args.get('email')
        if not email:
            return jsonify({'error': 'Email required'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify([]), 200
            
        print(f"📊 Fetching claims for user: {user.email} (ID: {user.id}) via Email Fallback")
        claims = Claim.query.filter_by(user_id=user.id).order_by(Claim.created_at.desc()).all()
        return jsonify([claim.to_dict() for claim in claims]), 200
    except Exception as e:
        print(f"❌ Error fetching claims by email: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/claims/<int:claim_id>', methods=['GET'])
@token_required
def get_claim(claim_id):
    """Get a specific claim by ID"""
    try:
        user = get_current_user()
        claim = Claim.query.filter_by(id=claim_id, user_id=user.id).first()
        
        if not claim:
            return jsonify({'error': 'Claim not found'}), 404
        
        return jsonify(claim.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/claims/<int:claim_id>', methods=['PUT'])
@token_required
def update_claim(claim_id):
    """Update a claim"""
    try:
        user = get_current_user()
        claim = Claim.query.filter_by(id=claim_id, user_id=user.id).first()
        
        if not claim:
            return jsonify({'error': 'Claim not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        old_status = claim.status
        
        # Helper function to parse datetime strings
        def parse_datetime(date_str):
            if not date_str:
                return None
            try:
                return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except:
                try:
                    return datetime.strptime(date_str, '%Y-%m-%d')
                except:
                    return None
        
        # Update fields
        if 'status' in data:
            claim.status = data['status']
        if 'policy_no' in data:
            claim.policy_no = data['policy_no']
        if 'vehicle_make' in data:
            claim.vehicle_make = data['vehicle_make']
        if 'claim_type' in data:
            claim.claim_type = data['claim_type']
        if 'branch' in data:
            claim.branch = data['branch']
        # Add more fields as needed
        
        claim.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Create notification if status changed
        if 'status' in data and old_status != claim.status:
            message = f"Your claim {claim.claim_number} status has been updated to {claim.status}."
            notification = Notification(
                user_id=user.id,
                claim_id=claim.id,
                message=message,
                notification_type=claim.status
            )
            db.session.add(notification)
            db.session.commit()
        
        return jsonify(claim.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/claims/<int:claim_id>/process', methods=['POST'])
@token_required
def process_claim(claim_id):
    """Process a claim and update its status"""
    try:
        user = get_current_user()
        claim = Claim.query.filter_by(id=claim_id, user_id=user.id).first()
        
        if not claim:
            return jsonify({'error': 'Claim not found'}), 404
        
        data = request.get_json()
        new_status = data.get('new_status') if data else request.args.get('new_status')
        
        if not new_status:
            return jsonify({'error': 'new_status parameter required'}), 400
        
        if new_status not in ["Pending", "Approved", "Rejected"]:
            return jsonify({'error': 'Invalid status. Must be one of: Pending, Approved, Rejected'}), 400
        
        old_status = claim.status
        claim.status = new_status
        claim.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Create notification for status change
        if old_status != new_status:
            message = f"Your claim {claim.claim_number} status has been updated to {new_status}."
            notification = Notification(
                user_id=user.id,
                claim_id=claim.id,
                message=message,
                notification_type=new_status
            )
            db.session.add(notification)
            db.session.commit()
        
        return jsonify(claim.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/notifications', methods=['GET'])
@token_required
def get_notifications():
    """Get all notifications for the current user"""
    try:
        user = get_current_user()
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 50, type=int)
        
        notifications = Notification.query.filter_by(user_id=user.id)\
            .order_by(Notification.created_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        return jsonify([notif.to_dict() for notif in notifications]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/user', methods=['GET'])
def get_notifications_by_email():
    """Get all notifications for a user by email"""
    try:
        email = request.args.get('email')
        if not email:
            return jsonify({'error': 'Email required'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify([]), 200
            
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 50, type=int)
        
        notifications = Notification.query.filter_by(user_id=user.id)\
            .order_by(Notification.created_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        return jsonify([notif.to_dict() for notif in notifications]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
@token_required
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        user = get_current_user()
        notification = Notification.query.filter_by(id=notification_id, user_id=user.id).first()
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'message': 'Notification marked as read'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/user/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read_by_email(notification_id):
    """Mark a notification as read by email"""
    try:
        email = request.args.get('email')
        if not email:
            return jsonify({'error': 'Email required'}), 400
            
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        notification = Notification.query.filter_by(id=notification_id, user_id=user.id).first()
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'message': 'Notification marked as read'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/notifications/unread/count', methods=['GET'])
@token_required
def get_unread_notification_count():
    """Get count of unread notifications"""
    try:
        user = get_current_user()
        count = Notification.query.filter_by(user_id=user.id, is_read=False).count()
        return jsonify({'count': count}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/claims', methods=['GET'])
def get_all_claims_admin():
    """Get all claims for admin dashboard"""
    try:
        claims = Claim.query.order_by(Claim.created_at.desc()).all()
        result = []
        for claim in claims:
            c_dict = claim.to_dict()
            if claim.user:
                c_dict['customer_name'] = f"{claim.user.first_name} {claim.user.last_name}".strip()
                if not c_dict['customer_name']:
                    c_dict['customer_name'] = claim.user.email
                c_dict['user_email'] = claim.user.email
            else:
                c_dict['customer_name'] = "Unknown"
            result.append(c_dict)
            
        return jsonify(result), 200
    except Exception as e:
        print(f"❌ Error fetching all claims for admin: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/claims/<int:claim_id>/process', methods=['POST'])
def admin_process_claim(claim_id):
    """Process a claim (Approve/Reject) by admin"""
    try:
        claim = Claim.query.filter_by(id=claim_id).first()
        
        if not claim:
            return jsonify({'error': 'Claim not found'}), 404
            
        data = request.get_json()
        new_status = data.get('new_status') if data else request.args.get('new_status')
        
        if not new_status:
            return jsonify({'error': 'new_status parameter required'}), 400
            
        if new_status not in ["Pending", "Approved", "Rejected"]:
            return jsonify({'error': 'Invalid status. Must be one of: Pending, Approved, Rejected'}), 400
            
        old_status = claim.status
        claim.status = new_status
        claim.updated_at = datetime.utcnow()
        db.session.commit()
        
        if old_status != new_status:
            message = f"Your claim {claim.claim_number} status has been updated to {new_status} by Admin."
            notification = Notification(
                user_id=claim.user_id,
                claim_id=claim.id,
                message=message,
                notification_type=new_status
            )
            db.session.add(notification)
            db.session.commit()
            
        c_dict = claim.to_dict()
        if claim.user:
            c_dict['customer_name'] = f"{claim.user.first_name} {claim.user.last_name}".strip()
            if not c_dict['customer_name']:
                c_dict['customer_name'] = claim.user.email
        
        return jsonify(c_dict), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/assess_damage', methods=['POST'])
def assess_damage():
    """Analyze car image for damage using YOLOv8 model"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        car_model = request.form.get('car_model', 'Unknown')
        
        image_bytes = file.read()
        
        # Process image through ML pipeline
        report = process_damage_assessment(image_bytes, car_model)
        
        # Return response as dict (since report is a Pydantic model response)
        return jsonify(report.model_dump()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    app.run(debug=False, use_reloader=False, host='0.0.0.0', port=port)
