from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app)

# Mock database for development
mock_users = {}
mock_claims = {}

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'message': 'Backend is running', 'firebase': False, 'mode': 'mock'}), 200

@app.route('/api/user/<uid>', methods=['GET'])
def get_user(uid):
    if uid in mock_users:
        user = mock_users[uid]
        return jsonify({
            'uid': uid,
            'firstName': user.get('firstName', ''),
            'lastName': user.get('lastName', ''),
            'email': user.get('email', '')
        }), 200
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/claims/<uid>', methods=['GET'])
def get_claims(uid):
    claims = [claim for claim in mock_claims.values() if claim.get('userId') == uid]
    return jsonify(claims), 200

@app.route('/api/claims', methods=['POST'])
def create_claim():
    try:
        data = request.get_json()
        uid = data.get('uid')
        customer_name = data.get('customerName', '')
        vehicle_model = data.get('vehicleModel', '')
        damage_type = data.get('damageType', '')
        severity = data.get('severity', 'Pending')
        estimated_cost = data.get('estimatedCost', 0)
        
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        claim_number = f"CLM-{timestamp}"
        claim_id = f"claim_{timestamp}"
        
        claim_data = {
            'id': claim_id,
            'claimNumber': claim_number,
            'userId': uid,
            'customerName': customer_name,
            'vehicleModel': vehicle_model,
            'damageType': damage_type,
            'severity': severity,
            'estimatedCost': estimated_cost,
            'status': 'Pending',
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        mock_claims[claim_id] = claim_data
        
        return jsonify({
            'id': claim_id,
            'claimNumber': claim_number,
            'message': 'Claim created successfully'
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats/<uid>', methods=['GET'])
def get_stats(uid):
    user_claims = [claim for claim in mock_claims.values() if claim.get('userId') == uid]
    
    total_claims = len(user_claims)
    top_damage_part = 'N/A'
    top_severity = 'N/A'
    total_cost = 0
    damage_count = {}
    severity_count = {}
    
    for claim in user_claims:
        total_cost += claim.get('estimatedCost', 0)
        damage_type = claim.get('damageType', '')
        if damage_type:
            damage_count[damage_type] = damage_count.get(damage_type, 0) + 1
        severity = claim.get('severity', '')
        if severity:
            severity_count[severity] = severity_count.get(severity, 0) + 1
    
    if damage_count:
        top_damage_part = max(damage_count, key=damage_count.get)
    if severity_count:
        top_severity = max(severity_count, key=severity_count.get)
    
    return jsonify({
        'totalClaims': total_claims,
        'topDamagePart': top_damage_part,
        'topSeverity': top_severity,
        'totalCost': total_cost
    }), 200

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    app.run(debug=True, port=port)