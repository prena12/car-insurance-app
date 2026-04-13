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
      vehicleMake: '',
      policyStartDate: '',
      claimCount: '',
      engine: '',
      policyEndDate: '',
      claimAmount: '',
      vehicleColor: '',
      vehicleStartDate: '',
      deductibleAmount: '',
      registrationNo: '',
      yearOfManufacture: '',
      vehicleEndDate: ''
    },
    claimForm: {
      claimType: '',
      branch: '',
      dateTime: '',
      incidentPlace: '',
      currentLocation: '',
      circumstances: '',
      missingParts: '',
      workshopType: '',
      vehicleType: '',
      dateField: '',
      workshopName: '',
      vehicleAvailability: ''
    },
    documents: {
      relationWithInsured: 'Self',
      name: '',
      contact: '',
      email: '',
      remarks: '',
      remarks2: '',
      dateTime: '',
      uploads: {
        registration: null,
        drivingLicense: null,
        nic: null
      }
    }
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      vehicleDetails: {
        ...prev.vehicleDetails,
        [field]: value
      }
    }));
  };

  const handleDocumentChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: value
      }
    }));
  };

  const handleClaimFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      claimForm: {
        ...prev.claimForm,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    try {
      // Get token from localStorage
      const token = localStorage.getItem('access_token');
      const submitEmail = formData.documents.email?.trim();

      if (!token && !submitEmail) {
        setSubmitError('Please login or provide an email to submit a claim.');
        setIsSubmitting(false);
        return;
      }

      // Prepare data for backend API
      const claimData = {
        // Vehicle Details
        policy_no: formData.vehicleDetails.policyNo || null,
        vehicle_make: formData.vehicleDetails.vehicleMake || null,
        policy_start_date: formData.vehicleDetails.policyStartDate || null,
        claim_count: formData.vehicleDetails.claimCount ? parseInt(formData.vehicleDetails.claimCount) : null,
        engine: formData.vehicleDetails.engine || null,
        policy_end_date: formData.vehicleDetails.policyEndDate || null,
        claim_amount: formData.vehicleDetails.claimAmount ? parseInt(formData.vehicleDetails.claimAmount) : null,
        vehicle_color: formData.vehicleDetails.vehicleColor || null,
        vehicle_start_date: formData.vehicleDetails.vehicleStartDate || null,
        deductible_amount: formData.vehicleDetails.deductibleAmount ? parseInt(formData.vehicleDetails.deductibleAmount) : null,
        registration_no: formData.vehicleDetails.registrationNo || null,
        year_of_manufacture: formData.vehicleDetails.yearOfManufacture ? parseInt(formData.vehicleDetails.yearOfManufacture) : null,
        vehicle_end_date: formData.vehicleDetails.vehicleEndDate || null,
        
        // Claim Form
        claim_type: formData.claimForm.claimType || null,
        branch: formData.claimForm.branch || null,
        date_time: formData.claimForm.dateTime || null,
        incident_place: formData.claimForm.incidentPlace || null,
        current_location: formData.claimForm.currentLocation || null,
        circumstances: formData.claimForm.circumstances || null,
        missing_parts: formData.claimForm.missingParts || null,
        workshop_type: formData.claimForm.workshopType || null,
        vehicle_type: formData.claimForm.vehicleType || null,
        date_field: formData.claimForm.dateField || null,
        workshop_name: formData.claimForm.workshopName || null,
        vehicle_availability: formData.claimForm.vehicleAvailability || null,
        
        // Documents
        relation_with_insured: formData.documents.relationWithInsured || 'Self',
        name: formData.documents.name || null,
        contact: formData.documents.contact || null,
        email: formData.documents.email || (user && user.email) || null,
        remarks: formData.documents.remarks || null,
        remarks2: formData.documents.remarks2 || null,
        documents_datetime: formData.documents.dateTime || null
      };

      // Call backend API
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

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
      console.log('Claim submitted successfully:', result);

      const localClaims = JSON.parse(localStorage.getItem('localClaims') || '[]');
      const updatedLocalClaims = Array.isArray(localClaims) ? [...localClaims, result] : [result];
      localStorage.setItem('localClaims', JSON.stringify(updatedLocalClaims));
      
      // Show success message and close form
      alert(`Claim submitted successfully! Claim Number: ${result.claim_number}`);
      onClose();
      onSuccess(result);
      
    } catch (error) {
      console.error('Error submitting claim:', error);
      setSubmitError(error.message || 'Failed to submit claim. Please try again.');
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
            <div className="form-grid">
              <div className="form-group">
                <label>Policy No</label>
                <input 
                  type="text" 
                  placeholder="e.g. POL/XX/XXXX"
                  value={formData.vehicleDetails.policyNo}
                  onChange={(e) => handleInputChange('policyNo', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Vehicle Make</label>
                <input 
                  type="text" 
                  placeholder="e.g. Suzuki"
                  value={formData.vehicleDetails.vehicleMake}
                  onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Policy Start Date</label>
                <input 
                  type="date"
                  value={formData.vehicleDetails.policyStartDate}
                  onChange={(e) => handleInputChange('policyStartDate', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Claim Count</label>
                <input 
                  type="number"
                  placeholder="e.g. 2"
                  value={formData.vehicleDetails.claimCount}
                  onChange={(e) => handleInputChange('claimCount', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Engine</label>
                <input 
                  type="text"
                  placeholder="e.g. XXX/XX/XXXXXXX"
                  value={formData.vehicleDetails.engine}
                  onChange={(e) => handleInputChange('engine', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Policy End Date</label>
                <input 
                  type="date"
                  value={formData.vehicleDetails.policyEndDate}
                  onChange={(e) => handleInputChange('policyEndDate', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Claim Amount</label>
                <input 
                  type="number"
                  placeholder="e.g. 15000"
                  value={formData.vehicleDetails.claimAmount}
                  onChange={(e) => handleInputChange('claimAmount', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Vehicle Color</label>
                <input 
                  type="text"
                  placeholder="e.g. White"
                  value={formData.vehicleDetails.vehicleColor}
                  onChange={(e) => handleInputChange('vehicleColor', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Vehicle Start Date</label>
                <input 
                  type="date"
                  value={formData.vehicleDetails.vehicleStartDate}
                  onChange={(e) => handleInputChange('vehicleStartDate', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Deductible Amount</label>
                <input 
                  type="number"
                  placeholder="e.g. 5000"
                  value={formData.vehicleDetails.deductibleAmount}
                  onChange={(e) => handleInputChange('deductibleAmount', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Registration No</label>
                <input 
                  type="text"
                  placeholder="e.g. ABC-123"
                  value={formData.vehicleDetails.registrationNo}
                  onChange={(e) => handleInputChange('registrationNo', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Year of Manufacture</label>
                <input 
                  type="number"
                  placeholder="e.g. 2015"
                  value={formData.vehicleDetails.yearOfManufacture}
                  onChange={(e) => handleInputChange('yearOfManufacture', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Vehicle End Date</label>
                <input 
                  type="date"
                  value={formData.vehicleDetails.vehicleEndDate}
                  onChange={(e) => handleInputChange('vehicleEndDate', e.target.value)}
                />
              </div>

            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="claim-form">
            <h2>Claim Form</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Claim Type</label>
                <select
                  value={formData.claimForm.claimType}
                  onChange={(e) => handleClaimFormChange('claimType', e.target.value)}
                >
                  <option value="">Select Claim Type</option>
                  <option value="accident">Accident</option>
                  <option value="theft">Theft</option>
                </select>
              </div>
              <div className="form-group">
                <label>Branch</label>
                <select
                  value={formData.claimForm.branch}
                  onChange={(e) => handleClaimFormChange('branch', e.target.value)}
                >
                  <option value="">Select Branch</option>
                  <option value="karachi">Karachi Branch</option>
                  <option value="lahore">Lahore Branch</option>
                  <option value="islamabad">Islamabad Branch</option>
                  <option value="hyderabad">Hyderabad Branch</option>
                  <option value="multan">Multan Branch</option>
                  <option value="peshawar">Peshawar Branch</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date & Time</label>
                <input 
                  type="datetime-local"
                  value={formData.claimForm.dateTime}
                  onChange={(e) => handleClaimFormChange('dateTime', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Incident Place</label>
                <input 
                  type="text" 
                  placeholder="Enter incident location"
                  value={formData.claimForm.incidentPlace}
                  onChange={(e) => handleClaimFormChange('incidentPlace', e.target.value)}
                />
              </div>
              <div className="form-group full-width">
                <label>Current Location</label>
                <input 
                  type="text" 
                  placeholder="Current location"
                  value={formData.claimForm.currentLocation}
                  onChange={(e) => handleClaimFormChange('currentLocation', e.target.value)}
                />
              </div>
              <div className="form-group full-width">
                <label>Circumstances of Claim/Loss</label>
                <textarea 
                  placeholder="Write your message..."
                  value={formData.claimForm.circumstances}
                  onChange={(e) => handleClaimFormChange('circumstances', e.target.value)}
                ></textarea>
              </div>
              <div className="form-group">
                <label>Missing Parts Details</label>
                <select
                  value={formData.claimForm.missingParts}
                  onChange={(e) => handleClaimFormChange('missingParts', e.target.value)}
                >
                  <option value="">Select Model</option>
                  <option value="front-bumper">Front Bumper</option>
                  <option value="rear-bumper">Rear Bumper</option>
                  <option value="headlights">Headlights</option>
                  <option value="taillights">Taillights</option>
                  <option value="side-mirror">Side Mirror</option>
                  <option value="door-panel">Door Panel</option>
                  <option value="windshield">Windshield</option>
                  <option value="hood-bonnet">Hood/Bonnet</option>
                  <option value="trunk">Trunk</option>
                </select>
              </div>
              <div className="form-group">
                <label>Workshop Type</label>
                <select
                  value={formData.claimForm.workshopType}
                  onChange={(e) => handleClaimFormChange('workshopType', e.target.value)}
                >
                  <option value="">Select Workshop</option>
                  <option value="authorized">Authorized Workshop</option>
                  <option value="partner">Partner Workshop</option>
                  <option value="local">Local Workshop</option>
                  <option value="in-house">In-House Workshop</option>
                </select>
              </div>
              <div className="form-group">
                <label>Vehicle Type</label>
                <select
                  value={formData.claimForm.vehicleType}
                  onChange={(e) => handleClaimFormChange('vehicleType', e.target.value)}
                >
                  <option value="">Select Vehicle</option>
                  <option value="toyota-corolla">Toyota Corolla</option>
                  <option value="honda-civic">Honda Civic</option>
                  <option value="suzuki-alto">Suzuki Alto</option>
                  <option value="suzuki-cultus">Suzuki Cultus</option>
                  <option value="honda-city">Honda City</option>
                  <option value="toyota-yaris">Toyota Yaris</option>
                  <option value="kia-sportage">Kia Sportage</option>
                  <option value="hyundai-tucson">Hyundai Tucson</option>
                  <option value="mg-hs">MG HS</option>
                  <option value="daihatsu-mira">Daihatsu Mira</option>
                  <option value="nissan-dayz">Nissan Dayz</option>
                  <option value="toyota-vitz">Toyota Vitz</option>
                  <option value="honda-br-v">Honda BR-V</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date Field</label>
                <input 
                  type="date"
                  value={formData.claimForm.dateField}
                  onChange={(e) => handleClaimFormChange('dateField', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Workshop Name</label>
                <input 
                  type="text" 
                  placeholder="Enter workshop name"
                  value={formData.claimForm.workshopName}
                  onChange={(e) => handleClaimFormChange('workshopName', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Vehicle Availability</label>
                <input 
                  type="text" 
                  placeholder="Enter availability"
                  value={formData.claimForm.vehicleAvailability}
                  onChange={(e) => handleClaimFormChange('vehicleAvailability', e.target.value)}
                />
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="documents">
            <h2>Required Documents & Customer Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Relation with Insured</label>
                <select
                  value={formData.documents.relationWithInsured}
                  onChange={(e) => handleDocumentChange('relationWithInsured', e.target.value)}
                >
        
                  <option value="Self">Self</option>
                  <option value="Other Family Member">Other Family Member</option>
                </select>
              </div>
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  placeholder="Full name"
                  value={formData.documents.name}
                  onChange={(e) => handleDocumentChange('name', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Contact</label>
                <input 
                  type="text" 
                  placeholder="Phone number"
                  value={formData.documents.contact}
                  onChange={(e) => handleDocumentChange('contact', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  placeholder="Email address"
                  value={formData.documents.email}
                  onChange={(e) => handleDocumentChange('email', e.target.value)}
                />
              </div>
              <div className="form-group full-width">
                <label>Remarks</label>
                <input 
                  type="text" 
                  placeholder="n/a"
                  value={formData.documents.remarks}
                  onChange={(e) => handleDocumentChange('remarks', e.target.value)}
                />
              </div>
              <div className="form-group full-width">
                <label>Remarks 2 / Additional Info</label>
                <textarea 
                  placeholder="n/a"
                  value={formData.documents.remarks2}
                  onChange={(e) => handleDocumentChange('remarks2', e.target.value)}
                ></textarea>
              </div>
              <div className="form-group">
                <label>Date/Time</label>
                <input 
                  type="datetime-local"
                  value={formData.documents.dateTime}
                  onChange={(e) => handleDocumentChange('dateTime', e.target.value)}
                />
              </div>
            </div>
            <div className="document-uploads">
              <div className="upload-box">
                <label>Registration Book Copy</label>
                <input type="file" accept="image/*,.pdf" />
              </div>
              <div className="upload-box">
                <label>Driving License</label>
                <input type="file" accept="image/*,.pdf" />
              </div>

              <div className="upload-box">
                <label>Upload NIC</label>
                <input type="file" accept="image/*,.pdf" />
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
        <button className="close-btn" onClick={handleClose}>&times;</button>
        
        <div className="steps-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <span>1</span>
            <p>Vehicle Details</p>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <span>2</span>
            <p>Claim Form</p>
          </div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <span>3</span>
            <p>Documents & Contact</p>
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
            {step > 1 && (
              <button 
                type="button" 
                className="back-btn" 
                onClick={() => setStep(step - 1)}
                disabled={isSubmitting}
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button 
                type="button" 
                className="next-btn" 
                onClick={() => setStep(step + 1)}
              >
                Next
              </button>
            ) : (
              <button 
                type="submit" 
                className="submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewClaimForm;