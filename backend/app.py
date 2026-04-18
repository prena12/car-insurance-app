from flask import Flask, request, jsonify, g, send_from_directory, send_file
from sqlalchemy import func
from flask_cors import CORS
import os
from dotenv import load_dotenv
from datetime import datetime
import secrets
import string
import uuid
import base64
import io
from fpdf import FPDF

from database import db, init_db
from models import User, Claim, Notification, DamageReport, DamageReportPart, Policy, InsuranceStaff
from auth import (
    hash_password, verify_password, generate_token,
    token_required, get_current_user, authenticate_user,
    verify_token, generate_staff_token, staff_token_required, get_current_staff
)
from ml_service import process_damage_assessment
from firebase_config import db as firestore_db

load_dotenv()

app = Flask(__name__)
# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'instance', 'car_insurance.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'reports'), exist_ok=True)

# Simplified CORS for maximum compatibility
CORS(app, resources={r"/*": {"origins": "*"}})

@app.before_request
def log_request_info():
    print(f"📡 [NET] Incoming {request.method} to {request.path} from {request.remote_addr}")

# Initialize database
init_db(app)

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


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


@app.route('/api/auth/verify_policy', methods=['POST'])
def verify_policy():
    """Verify if email and name exist in Policy table (Pre-signup check)"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        first_name = data.get('first_name', '').strip().lower()

        if not email or not first_name:
            return jsonify({'error': 'Email and First Name are required'}), 400

        # Check if email and name match a record in Policy table
        policy = Policy.query.filter(
            func.lower(Policy.email) == email,
            func.lower(Policy.user_name) == first_name
        ).first()

        if not policy:
            return jsonify({
                'error': 'Unauthorized: Your details do not match our policy records.'
            }), 403

        return jsonify({'message': 'Policy verified', 'status': 'success'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
        
        # NEW CRITICAL STEP: Check if user exists in Policy Whitelist (Email + Name)
        policy_exists = Policy.query.filter(
            func.lower(Policy.email) == email.lower(),
            func.lower(Policy.user_name) == first_name.lower()
        ).first()
        
        if not policy_exists:
            return jsonify({
                'error': 'Unauthorized: This Email and Name pair is not associated with an existing policy.'
            }), 403
        
        
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


@app.route('/api/auth/sync_firebase', methods=['POST'])
def sync_firebase():
    """Sync a Firebase-authenticated user with the local database and return a JWT token."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email = data.get('email', '').strip().lower()
        uid = data.get('uid', '')
        first_name = data.get('firstName', '') or data.get('first_name', '')
        last_name = data.get('lastName', '') or data.get('last_name', '')

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        # Find existing user by email
        user = User.query.filter(func.lower(User.email) == email).first()

        if not user:
            # Create user if they don't exist
            from auth import hash_password as hp
            hashed = hp(uid or 'firebase_user')  # use UID as password placeholder
            user = User(
                email=email,
                first_name=first_name or email.split('@')[0],
                last_name=last_name or '',
                hashed_password=hashed
            )
            db.session.add(user)
            db.session.commit()
            db.session.refresh(user)

            # Auto-assign claim number
            claim_number = generate_claim_number()
            user.claim_number = claim_number
            db.session.commit()
        else:
            # Update user's name if they already exist so it perfectly matches Firebase/Google
            if first_name or last_name:
                updated = False
                if first_name and user.first_name != first_name:
                    user.first_name = first_name
                    updated = True
                if last_name and user.last_name != last_name:
                    user.last_name = last_name
                    updated = True
                if updated:
                    db.session.commit()

        # Generate token
        from auth import generate_token as gen_token
        token = gen_token(user.id, user.email)

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
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


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

        # Strict Policy Cross-Verification
        req_policy_no = data.get('policy_no')
        req_name = data.get('name')
        req_email = data.get('email')

        if req_policy_no:
            policy = Policy.query.filter_by(policy_number=req_policy_no).first()
            if not policy:
                return jsonify({'error': f"Policy '{req_policy_no}' not found in our central records."}), 404
            
            # Verify Name
            if req_name and policy.user_name and req_name.strip().lower() != policy.user_name.strip().lower():
                return jsonify({'error': f"The name '{req_name}' does not match the registered owner for Policy {req_policy_no}."}), 400
                
            # Verify Email
            if req_email and policy.email and req_email.strip().lower() != policy.email.strip().lower():
                return jsonify({'error': f"The email '{req_email}' does not match the registered contact for Policy {req_policy_no}."}), 400


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
@token_required
def get_user_claims():
    """Get all global system claims (Unlocked Company View)"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        print(f"🌍 User {user.email} is accessing GLOBAL claims list.")
        claims = Claim.query.order_by(Claim.created_at.desc()).all()
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
@token_required
def get_user_notifications():
    """Get all notifications for the current authenticated user"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
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

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
@token_required
def mark_notification_as_read(notification_id):
    """Mark a notification as read for the current user"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 401
            
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




# ── STAFF & ADMIN AUTHENTICATION ──────────────────────────────

@app.route('/api/staff/login', methods=['POST'])
def staff_login():
    """Insurance staff login endpoint"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
            
        staff = InsuranceStaff.query.filter_by(email=email).first()
        if not staff or not verify_password(password, staff.hashed_password):
            return jsonify({'error': 'Incorrect email or password'}), 401
            
        # Generate staff-specific token
        token = generate_staff_token(staff.id, staff.email, staff.role)
        
        return jsonify({
            'access_token': token,
            'token_type': 'bearer',
            'staff': {
                'id': staff.id,
                'email': staff.email,
                'name': staff.full_name,
                'role': staff.role
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/staff/list', methods=['GET'])
@staff_token_required
def get_staff_list():
    """Manager only: See all staff members"""
    staff = get_current_staff()
    if staff.role != 'manager':
        return jsonify({'error': 'Unauthorized: Managers only'}), 403
        
    all_staff = InsuranceStaff.query.all()
    return jsonify([s.to_dict() for s in all_staff]), 200


@app.route('/api/staff/update-role', methods=['POST'])
@staff_token_required
def update_staff_role():
    """Manager only: Promote/Demote staff"""
    current_staff = get_current_staff()
    if current_staff.role != 'manager':
        return jsonify({'error': 'Unauthorized: Managers only'}), 403
        
    data = request.get_json()
    target_id = data.get('staff_id')
    new_role = data.get('role')
    
    if new_role not in ['manager', 'employee']:
        return jsonify({'error': 'Invalid role'}), 400
        
    target_staff = InsuranceStaff.query.get(target_id)
    if not target_staff:
        return jsonify({'error': 'Staff member not found'}), 404
        
    target_staff.role = new_role
    db.session.commit()
    return jsonify({'message': f'Updated {target_staff.full_name} to {new_role}'}), 200


# ── USER PORTAL APIS ──────────────────────────────────────────

@app.route('/api/user/stats', methods=['GET'])
@token_required
def get_user_stats():
    """Get global statistics for the entire company dashboard"""
    try:
        user = get_current_user()
        
        # 1. Global Totals
        total_claims = Claim.query.count()
        total_cost = db.session.query(func.sum(DamageReport.total_estimated_cost)).scalar() or 0
        
        # 2. Status Distribution
        status_dist = {
            'Pending': Claim.query.filter_by(status='Pending').count(),
            'Approved': Claim.query.filter_by(status='Approved').count(),
            'Rejected': Claim.query.filter_by(status='Rejected').count()
        }
        
        # 3. Top Car Models
        top_models_query = db.session.query(
            DamageReport.car_model, func.count(DamageReport.id)
        ).group_by(DamageReport.car_model).order_by(func.count(DamageReport.id).desc()).limit(5).all()
        top_models = [{'model': m[0], 'count': m[1]} for m in top_models_query]
        
        # 4. Severity Distribution
        from models import DamageReportPart
        sev_dist = {
            'Minor': DamageReportPart.query.filter_by(severity='Minor').count(),
            'Moderate': DamageReportPart.query.filter_by(severity='Moderate').count(),
            'Severe': DamageReportPart.query.filter_by(severity='Severe').count()
        }
        
        # 5. Top Damaged Part
        top_part_query = db.session.query(
            DamageReportPart.part_name, func.count(DamageReportPart.id)
        ).group_by(DamageReportPart.part_name).order_by(func.count(DamageReportPart.id).desc()).first()
        top_part = top_part_query[0] if top_part_query else "None"

        # 6. User Personal Stats (Sub-set)
        user_claims = Claim.query.filter_by(user_id=user.id).count()
        
        return jsonify({
            'total_repair_cost': total_cost,
            'most_frequent_part': top_part,
            'claim_count': user_claims,
            'global_stats': {
                'total_claims': total_claims,
                'total_cost': total_cost,
                'top_part': top_part,
                'status_distribution': status_dist,
                'severity_distribution': sev_dist,
                'top_models': top_models
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── ADMIN DASHBOARD APIS ──────────────────────────────────────

@app.route('/api/admin/stats', methods=['GET'])
@staff_token_required
def get_admin_stats():
    """Get aggregated statistics for administration dashboard"""
    try:
        total_claims = Claim.query.count()
        status_counts = {
            'Pending': Claim.query.filter_by(status='Pending').count(),
            'Approved': Claim.query.filter_by(status='Approved').count(),
            'Rejected': Claim.query.filter_by(status='Rejected').count()
        }
        
        # Calculate total estimated cost
        total_cost = db.session.query(func.sum(DamageReport.total_estimated_cost)).scalar() or 0
        
        # Get top car models with damages
        top_models_query = db.session.query(
            DamageReport.car_model, func.count(DamageReport.id)
        ).group_by(DamageReport.car_model).order_by(func.count(DamageReport.id).desc()).limit(5).all()
        
        top_models = [{'model': m[0], 'count': m[1]} for m in top_models_query]
        
        # Get most common damaged parts
        top_part_query = db.session.query(
            DamageReportPart.part_name, func.count(DamageReportPart.id)
        ).group_by(DamageReportPart.part_name).order_by(func.count(DamageReportPart.id).desc()).first()
        
        top_part = top_part_query[0] if top_part_query else "None"
        
        # Recent activities (last 10 claims)
        recent_claims = Claim.query.order_by(Claim.created_at.desc()).limit(10).all()
        recent_activities = []
        for c in recent_claims:
            recent_activities.append({
                'id': c.id,
                'claim_number': c.claim_number,
                'email': c.user.email if c.user else "Unknown",
                'status': c.status,
                'updated_at': c.updated_at.isoformat() if c.updated_at else None
            })
        
        return jsonify({
            'totalClaims': total_claims,
            'statusCounts': status_counts,
            'totalCost': total_cost,
            'topModels': top_models,
            'topDamagedPart': top_part,
            'recentActivities': recent_activities
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/claims', methods=['GET'])
@staff_token_required
def admin_get_claims():
    """Staff only: Get all claims in system"""
    claims = Claim.query.order_by(Claim.created_at.desc()).all()
    res = []
    for c in claims:
        d = c.to_dict()
        if c.user:
            d['customer_name'] = f"{c.user.first_name} {c.user.last_name}".strip() or c.user.email
        res.append(d)
    return jsonify(res), 200


@app.route('/api/admin/claims/<int:claim_id>/process', methods=['POST'])
@staff_token_required
def admin_process_claim(claim_id):
    """Manager only: Approve or Reject a claim"""
    staff = get_current_staff()
    if staff.role != 'manager':
        return jsonify({'error': 'Unauthorized: Only managers can approve/reject claims'}), 403
        
    data = request.get_json()
    new_status = data.get('new_status')
    if new_status not in ['Approved', 'Rejected']:
        return jsonify({'error': 'Invalid status'}), 400
        
    claim = Claim.query.get(claim_id)
    if not claim:
        return jsonify({'error': 'Claim not found'}), 404
        
    old_status = claim.status
    claim.status = new_status
    db.session.commit()
    
    # Notify user
    if old_status != new_status:
        notification = Notification(
            user_id=claim.user_id,
            claim_id=claim.id,
            message=f"Your claim {claim.claim_number} has been {new_status} by Admin Review.",
            notification_type=new_status
        )
        db.session.add(notification)
        db.session.commit()
        
    return jsonify(claim.to_dict()), 200


@app.route('/api/admin/all_reports', methods=['GET'])
@staff_token_required
def admin_get_all_reports():
    """Staff only: Get all AI assessment reports"""
    reports = DamageReport.query.order_by(DamageReport.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reports]), 200


@app.route('/api/reports', methods=['GET'])
@token_required
def get_user_reports():
    """Get all AI assessment reports (Global Insights Mode)"""
    reports = DamageReport.query.order_by(DamageReport.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reports]), 200


@app.route('/api/admin/policies', methods=['GET'])
@staff_token_required
def get_all_policies_admin():
    """Staff only: Get all policies for administrative management"""
    try:
        policies = Policy.query.all()
        total_insured = len(policies)
        active_policies = Policy.query.filter_by(status='Active').count()
        expired_policies = Policy.query.filter_by(status='Expired').count()
        
        policy_list = []
        for p in policies:
            p_dict = p.to_dict()
            p_dict['claim_count'] = Claim.query.filter_by(policy_no=p.policy_number).count()
            policy_list.append(p_dict)
            
        return jsonify({
            'policies': policy_list,
            'stats': {
                'total_insured': total_insured,
                'active_policies': active_policies,
                'expired_policies': expired_policies
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/reports/<int:report_id>/download', methods=['GET'])
def admin_download_report(report_id):
    """Generate and download PDF for a report (accessible by staff AND regular users)"""
    # Accept either staff_token or regular user access_token
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization token required'}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    # Token is valid (staff or user) — proceed
    report = DamageReport.query.get(report_id)
    if not report:
        return jsonify({'error': 'Report not found'}), 404
        
    try:
        upload_folder = app.config['UPLOAD_FOLDER']

        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()

        # ── Header ────────────────────────────────────────────
        pdf.set_fill_color(26, 32, 44)
        pdf.rect(0, 0, 210, 28, 'F')
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Arial", 'B', 18)
        pdf.set_xy(0, 8)
        pdf.cell(0, 12, "IntelliClaims  |  AI Assessment Report", align='C', ln=True)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(6)

        # ── Report Info ────────────────────────────────────────
        pdf.set_font("Arial", size=11)
        pdf.cell(0, 7, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}    |    Report ID: #{report.id}", ln=True)
        if report.claim:
            pdf.cell(0, 7, f"Claim No: {report.claim.claim_number}    |    Policy: {report.claim.policy_no or 'N/A'}", ln=True)
        pdf.cell(0, 7, f"Vehicle Model: {report.car_model or 'N/A'}    |    Recommendation: {report.claim_recommendation or 'N/A'}", ln=True)
        pdf.ln(5)

        # ── Damage Images (side-by-side if available) ─────────
        img_paths = {
            'Parts Detection': report.parts_img_path,
            'Severity Map':    report.severity_img_path,
        }
        if report.original_img_path:
            img_paths = {'Original Uploaded': report.original_img_path, **img_paths}

        valid_images = []
        for label, rel_path in img_paths.items():
            if rel_path:
                full_path = os.path.join(upload_folder, rel_path)
                if os.path.exists(full_path):
                    valid_images.append((label, full_path))

        if valid_images:
            pdf.set_font("Arial", 'B', 13)
            pdf.cell(0, 9, "Damage Images", ln=True)
            pdf.ln(2)

            # Lay the images in a row; up to 3 images, max width ~60mm each
            page_w = 190  # usable width in mm
            n = len(valid_images)
            img_w = min(60, page_w // n)
            img_h = 50
            x_start = pdf.get_x()
            y_start = pdf.get_y()

            for i, (label, path) in enumerate(valid_images):
                x = x_start + i * (img_w + 4)
                try:
                    pdf.image(path, x=x, y=y_start, w=img_w, h=img_h)
                    # Label under image
                    pdf.set_xy(x, y_start + img_h + 1)
                    pdf.set_font("Arial", 'I', 8)
                    pdf.cell(img_w, 5, label, align='C')
                except Exception:
                    pass  # Skip image if it can't be embedded

            pdf.set_xy(x_start, y_start + img_h + 8)
            pdf.ln(4)

        # ── Damaged Parts Table ────────────────────────────────
        pdf.set_font("Arial", 'B', 13)
        pdf.cell(0, 9, "Damaged Parts Breakdown", ln=True)
        pdf.ln(2)

        # Table header
        pdf.set_fill_color(26, 32, 44)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Arial", 'B', 11)
        pdf.cell(80, 9, "Part Name",            border=1, fill=True)
        pdf.cell(50, 9, "Severity",              border=1, fill=True)
        pdf.cell(60, 9, "Estimated Cost (PKR)",  border=1, fill=True, ln=True)

        # Table rows (alternating shading)
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Arial", size=11)
        for idx, part in enumerate(report.parts):
            if idx % 2 == 0:
                pdf.set_fill_color(245, 247, 250)
            else:
                pdf.set_fill_color(255, 255, 255)
            pdf.cell(80, 8, str(part.part_name or ''),       border=1, fill=True)
            pdf.cell(50, 8, str(part.severity or ''),        border=1, fill=True)
            pdf.cell(60, 8, f"PKR {part.estimated_cost or 0:,}", border=1, fill=True, ln=True)

        if not report.parts:
            pdf.cell(0, 8, "No specific part damage detected.", border=1, ln=True)

        # ── Total ──────────────────────────────────────────────
        pdf.ln(3)
        pdf.set_font("Arial", 'B', 12)
        pdf.set_fill_color(255, 237, 213)
        pdf.cell(0, 10, f"  Total Estimated Repair Cost:  PKR {report.total_estimated_cost or 0:,}", border=1, fill=True, ln=True)

        # ── Disclaimer ─────────────────────────────────────────
        pdf.ln(6)
        pdf.set_font("Arial", 'I', 9)
        pdf.set_text_color(120, 120, 120)
        pdf.multi_cell(0, 6, "Note: This is an AI-generated report. Cost estimates may vary. "
                             "Please verify with a certified mechanic or claims expert before proceeding.")

        # ── Output ────────────────────────────────────────────
        raw = pdf.output(dest='S')
        pdf_bytes = raw.encode('latin-1') if isinstance(raw, str) else bytes(raw)
        output = io.BytesIO(pdf_bytes)
        output.seek(0)
        return send_file(output, as_attachment=True,
                         download_name=f"IntelliClaims_Report_{report.id}.pdf",
                         mimetype='application/pdf')

    except Exception as e:
        return jsonify({'error': f"PDF generation failed: {str(e)}"}), 500



@app.route('/api/assess_damage', methods=['POST'])
@token_required
def assess_damage():
    """Analyze car image for damage using YOLOv8 model and save the report"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        car_model = request.form.get('car_model', 'Unknown')
        claim_id = request.form.get('claim_id') 
        
        image_bytes = file.read()
        
        # Process image through ML pipeline
        report_data = process_damage_assessment(image_bytes, car_model)
        
        # Save images to disk
        upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], 'reports')
        os.makedirs(upload_folder, exist_ok=True)
        unique_id = uuid.uuid4().hex
        
        paths = {}
        for key, prefix in [('original', 'orig'), ('parts', 'parts'), ('severity', 'sev')]:
            b64_data = getattr(report_data, f"{key}_image_base64", None)
            if b64_data:
                # Remove data:image/jpeg;base64, if present
                if ',' in b64_data:
                    b64_data = b64_data.split(',')[1]
                img_data = base64.b64decode(b64_data)
                filename = f"{prefix}_{unique_id}.jpg"
                filepath = os.path.join(upload_folder, filename)
                with open(filepath, 'wb') as f:
                    f.write(img_data)
                paths[key] = f"reports/{filename}"
                
        # Create DB record
        db_report = DamageReport(
            claim_id=claim_id if claim_id and claim_id.isdigit() else None,
            user_id=g.current_user.id,
            car_model=report_data.car_model,
            total_estimated_cost=report_data.total_estimated_cost,
            claim_recommendation=report_data.claim_recommendation,
            original_img_path=paths.get('original'),
            parts_img_path=paths.get('parts'),
            severity_img_path=paths.get('severity')
        )
        db.session.add(db_report)
        db.session.flush() # Get ID
        
        # Add parts
        for part in report_data.damaged_parts:
            db_part = DamageReportPart(
                report_id=db_report.id,
                part_name=part.part_name,
                severity=part.severity,
                confidence=part.confidence,
                estimated_cost=part.estimated_cost
            )
            db.session.add(db_part)
            
        db.session.commit()
        
        # Return complete data including new ID and URLs
        response_data = report_data.model_dump()
        response_data['id'] = db_report.id
        
        return jsonify(response_data), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    app.run(debug=False, use_reloader=False, host='0.0.0.0', port=port)

