import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import './NewClaimForm.css';

const NewClaimForm = ({ onClose = () => {}, onSuccess = () => {} }) => {
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    vehicleDetails: {
      policyNo: '',
      policyStartDate: '',
      policyEndDate: '',
      relationWithInsured: '',
      registrationNo: '',
      vehicleMake: '',
      vehicleModel: '',
      yearOfManufacture: '',
      engineNo: '',
      vehicleType: ''
    },
    claimDetails: {
      claimType: '',
      incidentDateTime: '',
      fullName: user ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
      emailAddress: user?.email || '',
    }
  });

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const submitEmail = formData.claimDetails.emailAddress?.trim();

      if (!token && !submitEmail) {
        setSubmitError('Please login or provide an email to submit a claim.');
        setIsSubmitting(false);
        return;
      }

      // Mapping to existing backend schema (Backend logic preserved)
      const claimData = {
        policy_no: formData.vehicleDetails.policyNo || null,
        policy_start_date: formData.vehicleDetails.policyStartDate || null,
        policy_end_date: formData.vehicleDetails.policyEndDate || null,
        relation_with_insured: formData.vehicleDetails.relationWithInsured || 'Self',
        registration_no: formData.vehicleDetails.registrationNo || null,
        vehicle_make: formData.vehicleDetails.vehicleMake || null,
        vehicle_model: formData.vehicleDetails.vehicleModel || null,
        year_of_manufacture: formData.vehicleDetails.yearOfManufacture ? parseInt(formData.vehicleDetails.yearOfManufacture) : null,
        engine: formData.vehicleDetails.engineNo || null,
        vehicle_type: formData.vehicleDetails.vehicleType || null,
        
        claim_type: formData.claimDetails.claimType || null,
        date_time: formData.claimDetails.incidentDateTime || null,
        name: formData.claimDetails.fullName || null,
        email: formData.claimDetails.emailAddress || (user && user.email) || null,
        
        // Removed fields sent as null to avoid breaking backend expectations
        incident_place: null,
        current_location: null,
        circumstances: null
      };

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('http://localhost:5000/api/claims', {
        method: 'POST',
        headers,
        body: JSON.stringify(claimData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit claim');
      }

      const result = await response.json();
      alert(`Claim submitted successfully! Claim Number: ${result.claim_number}`);
      onClose();
      onSuccess(result);
      
    } catch (error) {
      console.error('Error submitting claim:', error);
      setSubmitError(error.message || 'Failed to submit claim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="vehicle-details">
            <h2>Vehicle Details</h2>
            <p className="step-subtext">Enter your policy and vehicle information</p>
            
            <div className="form-grid">
              <div className="section-divider">POLICY INFORMATION</div>
              
              <div className="form-group">
                <label>POLICY NUMBER <span>*</span></label>
                <input 
                  type="text" 
                  placeholder="e.g. POL/2024/XXXX"
                  value={formData.vehicleDetails.policyNo}
                  onChange={(e) => handleInputChange('vehicleDetails', 'policyNo', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>POLICY START DATE <span>*</span></label>
                <input 
                  type="date"
                  value={formData.vehicleDetails.policyStartDate}
                  onChange={(e) => handleInputChange('vehicleDetails', 'policyStartDate', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>POLICY END DATE <span>*</span></label>
                <input 
                  type="date"
                  value={formData.vehicleDetails.policyEndDate}
                  onChange={(e) => handleInputChange('vehicleDetails', 'policyEndDate', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>RELATION WITH INSURED <span>*</span></label>
                <select
                  value={formData.vehicleDetails.relationWithInsured}
                  onChange={(e) => handleInputChange('vehicleDetails', 'relationWithInsured', e.target.value)}
                  required
                >
                  <option value="">Select relation</option>
                  <option value="Self">Self</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Driver">Driver</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="section-divider">VEHICLE INFORMATION</div>

              <div className="form-group">
                <label>REGISTRATION NUMBER <span>*</span></label>
                <input 
                  type="text" 
                  placeholder="e.g. ABC-123"
                  value={formData.vehicleDetails.registrationNo}
                  onChange={(e) => handleInputChange('vehicleDetails', 'registrationNo', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>VEHICLE MAKE <span>*</span></label>
                <select
                  value={formData.vehicleDetails.vehicleMake}
                  onChange={(e) => handleInputChange('vehicleDetails', 'vehicleMake', e.target.value)}
                  required
                >
                  <option value="">Select make</option>
                  <option value="Suzuki">Suzuki</option>
                  <option value="Toyota">Toyota</option>
                  <option value="Honda">Honda</option>
                  <option value="Kia">Kia</option>
                  <option value="Hyundai">Hyundai</option>
                  <option value="MG">MG</option>
                  <option value="Changan">Changan</option>
                  <option value="Daihatsu">Daihatsu</option>
                </select>
              </div>
              <div className="form-group">
                <label>VEHICLE MODEL <span>*</span></label>
                <input 
                  type="text" 
                  placeholder="e.g. Corolla, Cultus..."
                  value={formData.vehicleDetails.vehicleModel}
                  onChange={(e) => handleInputChange('vehicleDetails', 'vehicleModel', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>YEAR OF MANUFACTURE <span>*</span></label>
                <select
                  value={formData.vehicleDetails.yearOfManufacture}
                  onChange={(e) => handleInputChange('vehicleDetails', 'yearOfManufacture', e.target.value)}
                  required
                >
                  <option value="">Select year</option>
                  {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>ENGINE NUMBER <span>*</span></label>
                <input 
                  type="text" 
                  placeholder="e.g. XXX/XX/XXXXXXX"
                  value={formData.vehicleDetails.engineNo}
                  onChange={(e) => handleInputChange('vehicleDetails', 'engineNo', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>VEHICLE TYPE</label>
                <select
                  value={formData.vehicleDetails.vehicleType}
                  onChange={(e) => handleInputChange('vehicleDetails', 'vehicleType', e.target.value)}
                >
                  <option value="">Select model</option>
                  <option value="Toyota Corolla">Toyota Corolla</option>
                  <option value="Honda Civic">Honda Civic</option>
                  <option value="Suzuki Alto">Suzuki Alto</option>
                  <option value="Suzuki Cultus">Suzuki Cultus</option>
                  <option value="Honda City">Honda City</option>
                  <option value="Toyota Yaris">Toyota Yaris</option>
                  <option value="Kia Sportage">Kia Sportage</option>
                  <option value="Hyundai Tucson">Hyundai Tucson</option>
                  <option value="MG HS">MG HS</option>
                  <option value="Daihatsu Mira">Daihatsu Mira</option>
                  <option value="Nissan Dayz">Nissan Dayz</option>
                  <option value="Toyota Vitz">Toyota Vitz</option>
                  <option value="Honda BR-V">Honda BR-V</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="claim-form">
            <h2>Claim Details</h2>
            <p className="step-subtext">Tell us about the incident and provide contact info</p>
            
            <div className="form-grid">
              <div className="section-divider">INCIDENT INFORMATION</div>
              <div className="form-group">
                <label>CLAIM TYPE <span>*</span></label>
                <select
                  value={formData.claimDetails.claimType}
                  onChange={(e) => handleInputChange('claimDetails', 'claimType', e.target.value)}
                  required
                >
                  <option value="">Select type</option>
                  <option value="Collison/Accident">Collison/Accident</option>
                  <option value="Scratch and Dent">Scratch and Dent</option>
                  <option value="Flood Damage">Flood Damage</option>
                  <option value="Fire Damage">Fire Damage</option>
                </select>
              </div>
              <div className="form-group">
                <label>INCIDENT DATE & TIME <span>*</span></label>
                <input 
                  type="datetime-local"
                  value={formData.claimDetails.incidentDateTime}
                  onChange={(e) => handleInputChange('claimDetails', 'incidentDateTime', e.target.value)}
                  required
                />
              </div>

              <div className="section-divider">CONTACT INFORMATION</div>
              <div className="form-group">
                <label>FULL NAME <span>*</span></label>
                <input 
                  type="text" 
                  placeholder="As on CNIC"
                  value={formData.claimDetails.fullName}
                  onChange={(e) => handleInputChange('claimDetails', 'fullName', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  placeholder="your@email.com"
                  value={formData.claimDetails.emailAddress}
                  onChange={(e) => handleInputChange('claimDetails', 'emailAddress', e.target.value)}
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="new-claim-modal" onClick={(e) => {
      if (e.target === e.currentTarget) handleClose();
    }}>
      <div className="modal-content">
        <button type="button" className="close-btn" onClick={handleClose}>&times;</button>
        
        <div className="steps-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <span>1</span>
            <p>Vehicle Details</p>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <span>2</span>
            <p>Claim Details</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {renderStep()}
          
          {submitError && (
            <div style={{ 
              color: 'red', 
              padding: '10px', 
              margin: '10px 0', 
              background: '#ffe6e6', 
              borderRadius: '5px',
              textAlign: 'center'
            }}>
              {submitError}
            </div>
          )}
          
          <div className="form-actions">
            {step > 1 ? (
              <button 
                type="button" 
                className="back-btn" 
                onClick={() => setStep(step - 1)}
                disabled={isSubmitting}
              >
                ← Back
              </button>
            ) : (
              <div /> // Spacer
            )}
            
            {step < 2 ? (
              <button 
                type="button" 
                className="next-btn" 
                onClick={() => setStep(step + 1)}
              >
                Next — Claim Details →
              </button>
            ) : (
              <button 
                type="submit" 
                className="submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewClaimForm;