import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';
import './AIReport.css';

const AIReport = ({ selectedClaim = null, viewOnly = false, onNavigateToHistory }) => {
  const [activeStep, setActiveStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [carModel, setCarModel] = useState("");
  const [assessmentReport, setAssessmentReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState(false);

  // Check if claim has existing report when component mounts
  React.useEffect(() => {
    if (selectedClaim) {
      const savedReports = JSON.parse(localStorage.getItem('damageReports') || '[]');
      // Try to find report for this claim by matching timestamps or claim details
      const existingReport = savedReports.find(report => {
        const rNum = report.claim_number || report.claimNumber;
        const sNum = selectedClaim.claim_number || selectedClaim.claimNumber;
        
        // Match strictly by claim number if available
        if (rNum && sNum && rNum === sNum) return true;
        
        // Fallback for legacy reports that didn't save the claim number
        if (!rNum && report.date && selectedClaim.created_at) {
          return new Date(report.date).toDateString() === new Date(selectedClaim.created_at).toDateString();
        }
        return false;
      });
      
      if (existingReport) {
        setAssessmentReport(existingReport);
        setViewMode(true);
        setActiveStep(3);
      } else if (viewOnly) {
        setViewMode(true);
        setAssessmentReport(null);
      }
    }
  }, [selectedClaim, viewOnly]);

  const carModelsList = [
    "Toyota Corolla",
    "Honda Civic",
    "Suzuki Alto",
    "Suzuki Cultus",
    "Honda City",
    "Toyota Yaris",
    "Kia Sportage",
    "Hyundai Tucson",
    "MG HS",
    "Daihatsu Mira",
    "Nissan Dayz",
    "Toyota Vitz",
    "Honda BR-V"
  ];

  const downloadPDF = () => {
    if (!assessmentReport) return;

    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center; margin-bottom: 10px;">Vehicle Damage Report</h1>
        <p style="text-align: center; color: #666; margin-bottom: 30px;">Generated on ${new Date().toLocaleDateString()}</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
            <h3 style="margin: 0 0 10px; color: #444;">Vehicle Info</h3>
            <p><strong>Model:</strong> ${assessmentReport.car_model || 'Unknown'}</p>
            <p><strong>Group:</strong> —</p>
          </div>
          <div style="background: #fff7eb; padding: 15px; border-radius: 8px;">
            <h3 style="margin: 0 0 10px; color: #444;">Damage Summary</h3>
            <p style="font-size: 18px; font-weight: bold; color: #d46016;">Estimated Repair Cost: PKR ${assessmentReport.total_estimated_cost?.toLocaleString() || '0'}</p>
          </div>
        </div>
        
        <h3 style="color: #333; margin-bottom: 15px;">Damage Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Damaged Part</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Severity</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Cost (PKR)</th>
            </tr>
          </thead>
          <tbody>
            ${assessmentReport.damaged_parts?.map(part => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${part.part_name}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${part.severity}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${part.estimated_cost.toLocaleString()}</td>
              </tr>
            `).join('') || '<tr><td colspan="3" style="padding: 10px; text-align: center; border: 1px solid #ddd;">No damages detected</td></tr>'}
          </tbody>
          <tfoot>
            <tr style="background: #fffaf2; font-weight: bold;">
              <td colspan="2" style="padding: 10px; border: 1px solid #ddd;">Total:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">PKR ${assessmentReport.total_estimated_cost?.toLocaleString() || '0'}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style="background: #fff3e8; border: 1px solid #f8dcc7; border-radius: 8px; color: #7d570f; padding: 15px; margin-bottom: 20px;">
          <strong>Note:</strong> This is an AI-generated report. Please verify with a certified expert.
        </div>
      </div>
    `;

    const opt = {
      margin: 1,
      filename: `damage-report-${assessmentReport.car_model || 'unknown'}-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const StepIndicator = () => (
    <div className="steps-progress">
      <div className={`step ${activeStep >= 1 ? 'active' : ''}`}>
        <div className="step-circle">1</div>
        <p>Upload Images</p>
      </div>
      <div className="step-line"></div>
      <div className={`step ${activeStep >= 2 ? 'active' : ''}`}>
        <div className="step-circle">2</div>
        <p>Review Damage</p>
      </div>
      <div className="step-line"></div>
      <div className={`step ${activeStep >= 3 ? 'active' : ''}`}>
        <div className="step-circle">3</div>
        <p>Generate Report</p>
      </div>
    </div>
  );

  const UploadStep = () => {
    const fileInputRef = React.useRef(null);

    const handleBrowseClick = () => {
      fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
      const files = Array.from(event.target.files);
      if (files.length > 0) setSelectedFile(files[0]);
    };

    return (
      <div className="upload-step">
        <h2>Upload Vehicle Images</h2>
        <div className="upload-box">
          <div className="upload-icon">📤</div>
          <p>Drag and drop images or</p>
          <button className="browse-btn" onClick={handleBrowseClick}>
            browse
          </button>
          <input 
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <small>JPG, PNG up to 5MB {selectedFile && `| Selected: ${selectedFile.name}`}</small>
        </div>
        <div className="search-model" style={{ marginTop: '25px', textAlign: 'left', width: '100%' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontSize: '13px', fontWeight: 'bold' }}>Search Car Model <span style={{ color: '#e74c3c' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <select
              value={carModel}
              onChange={(e) => setCarModel(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 15px',
                borderRadius: '8px',
                border: carModel ? '2px solid #27ae60' : '2px solid #e74c3c',
                fontSize: '14.5px',
                outline: 'none',
                color: carModel ? '#27ae60' : '#999',
                backgroundColor: '#fff',
                cursor: 'pointer',
                fontWeight: carModel ? '600' : '400'
              }}
            >
              <option value="" disabled>Select a vehicle...</option>
              {carModelsList.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            {carModel && (
              <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#27ae60', fontSize: '18px', pointerEvents: 'none' }}>
                ✓
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ReviewStep = () => (
    <div className="review-step">
      <h2>Review Damage</h2>
      <p>Review the detected damage from the uploaded images.</p>
      
      {assessmentReport?.original_image_base64 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px', marginBottom: '20px' }}>
          <div className="damage-card">
             <span className="damage-label">Uploaded</span>
             <img className="damage-image" src={assessmentReport.original_image_base64} alt="Original" />
          </div>
          <div className="damage-card">
             <span className="damage-label">Parts detection</span>
             <img className="damage-image" src={assessmentReport.parts_image_base64} alt="Parts detection" />
          </div>
          <div className="damage-card">
             <span className="damage-label">Severity map</span>
             <img className="damage-image" src={assessmentReport.severity_image_base64} alt="Severity map" />
          </div>
        </div>
      )}

      <div className="ai-assessment" style={{ 
        background: '#fff', 
        borderRadius: '10px', 
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)', 
        marginTop: '40px',
        border: '1px solid #eaeaea',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '25px 35px 5px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '25px', color: '#333', fontSize: '1.2rem', fontWeight: 'bold' }}>
            AI Assessment Summary
          </h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '10px 0', borderBottom: '1px solid #eaeaea', fontSize: '14px', flexWrap: 'wrap' }}>
             <div style={{ color: '#555', fontWeight: '500' }}>Car model</div>
             <div style={{ color: '#333', fontWeight: '600', minWidth: '170px', textAlign: 'right' }}>{assessmentReport.car_model || 'Unknown'}</div>
          </div>
          
          <div className="assessment-table">
            <div className="table-header">
              <div>Damaged parts</div>
              <div>Severity</div>
              <div style={{ textAlign: 'right' }}>Cost</div>
            </div>
            <div className="table-rows">
              {assessmentReport?.damaged_parts?.length ? assessmentReport.damaged_parts.map((part, idx) => (
                <div className="table-row" key={idx}>
                  <div>{part.part_name}</div>
                  <div>{part.severity}</div>
                  <div style={{ textAlign: 'right' }}>PKR {part.estimated_cost.toLocaleString()}</div>
                </div>
              )) : (
                <div className="table-row empty-row">
                  No damages detected.
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="table-footer" style={{ textAlign: 'left', padding: '16px 35px', background: '#fff3e8', borderTop: '1px solid #fce4d0' }}>
          <span style={{ color: '#ff8a00', fontWeight: 'bold', fontSize: '15px' }}>
            Total estimated repair cost: PKR {assessmentReport?.total_estimated_cost?.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );

  const ReportStep = () => {
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    return (
      <div className="report-step">
        <h2>Generate Report</h2>

        {selectedClaim && (
          <div className="report-claim-summary" style={{ marginBottom: '20px', padding: '16px', border: '1px solid #e4e4e4', borderRadius: '12px', background: '#fbfbfb' }}>
            <h3 style={{ marginBottom: '12px' }}>Submitted Claim Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div><strong>Claim No:</strong> {selectedClaim.claim_number || selectedClaim.claimNumber || 'N/A'}</div>
              <div><strong>Name:</strong> {selectedClaim.name || selectedClaim.email || 'Unknown'}</div>
              <div><strong>Policy No:</strong> {selectedClaim.policy_no || 'N/A'}</div>
              <div><strong>Claim Amount:</strong> PKR {(selectedClaim.claim_amount || 0).toLocaleString()}</div>
              <div><strong>Date:</strong> {selectedClaim.created_at ? new Date(selectedClaim.created_at).toLocaleDateString() : 'N/A'}</div>
            </div>
          </div>
        )}

        <div className="report-card">
          <div className="report-card-header">
            <div>
              <p className="report-card-title">Vehicle Damage Report</p>
              <p className="report-card-date">Generated on {generatedDate}</p>
            </div>
            <button className="download-btn" onClick={downloadPDF}>
              Download PDF
            </button>
          </div>

          <div className="report-grid-two report-summary-grid">
            <div className="report-panel">
              <p className="panel-heading">Vehicle Info</p>
              <div className="report-item"><span>Model:</span><span>{assessmentReport?.car_model || 'Unknown'}</span></div>
              <div className="report-item"><span>Group:</span><span>—</span></div>
            </div>
            <div className="report-panel report-summary-panel">
              <p className="panel-heading">Damage Summary</p>
              <div className="summary-cost">
                <span>Estimated Repair Cost:</span>
                <strong>PKR {assessmentReport?.total_estimated_cost?.toLocaleString() || '0'}</strong>
              </div>
            </div>
          </div>

          <div className="report-section">
            <p className="section-title">Damage Breakdown</p>
            <div className="report-table">
              <div className="report-table-header">
                <div>Damaged Part</div>
                <div>Severity</div>
                <div>Cost (PKR)</div>
              </div>
              {assessmentReport?.damaged_parts?.length ? (
                assessmentReport.damaged_parts.map((part, idx) => (
                  <div className="report-table-row" key={idx}>
                    <div>{part.part_name}</div>
                    <div>{part.severity}</div>
                    <div>{part.estimated_cost.toLocaleString()}</div>
                  </div>
                ))
              ) : (
                <div className="report-table-row empty-row">No damages detected.</div>
              )}
              <div className="report-table-footer">
                <span>Total:</span>
                <strong>PKR {assessmentReport?.total_estimated_cost?.toLocaleString() || '0'}</strong>
              </div>
            </div>
          </div>

          <div className="report-grid-two report-images-grid">
            <div className="report-image-block">
              <p>Detected Parts</p>
              <img src={assessmentReport?.parts_image_base64} alt="Detected Parts" />
            </div>
            <div className="report-image-block">
              <p>Severity Map</p>
              <img src={assessmentReport?.severity_image_base64} alt="Severity Map" />
            </div>
          </div>

          <div className="report-note">
            <strong>Note:</strong> This is an AI-generated report. Please verify with a certified expert.
          </div>

          <div className="report-actions">
            <label className="inspection-label">
              <input type="checkbox" /> Mark for manual inspection / Send to Claims Manager
            </label>
            <div className="report-links">
              <button className="link-button" onClick={() => setActiveStep(1)}>Re-upload image</button>
              <button className="link-button" onClick={onNavigateToHistory}>View History</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleNext = async () => {
    if (activeStep === 1) {
      if (!selectedFile) {
        alert("Please select an image first!");
        return;
      }
      if (!carModel || carModel.trim() === "") {
        alert("Please select a car model before proceeding!");
        return;
      }
      setIsLoading(true);
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("car_model", carModel);

      try {
        const token = localStorage.getItem("access_token"); 
        
        const response = await fetch("http://127.0.0.1:5000/api/assess_damage", {
          method: "POST",
          headers: {
            ...(token ? {"Authorization": `Bearer ${token}`} : {})
          },
          body: formData
        });
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to process image");
        }
        
        setAssessmentReport(data);
        // Save to history including claim identifier
        const reportWithDate = { 
          ...data, 
          date: new Date().toISOString(),
          claim_number: selectedClaim?.claim_number || selectedClaim?.claimNumber,
          created_at: selectedClaim?.created_at
        };
        const existingHistory = JSON.parse(localStorage.getItem('damageReports') || '[]');
        existingHistory.push(reportWithDate);
        localStorage.setItem('damageReports', JSON.stringify(existingHistory));
        setActiveStep(2);
      } catch(e) {
        alert("Error: " + e.message);
      } finally {
        setIsLoading(false);
      }
    } else if (activeStep < 3) {
      setActiveStep(curr => curr + 1);
    }
  };

  return (
    <div className="ai-report">
      <div className="main-header">
        <h1 className="report-title">{viewMode ? 'Claim Report' : 'Generate AI Report'}</h1>
      </div>

      {!viewMode && <StepIndicator />}
      
      <div className="step-content">
        {viewMode ? (
          assessmentReport ? <ReportStep /> : (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#666', background: '#fff', borderRadius: '12px', border: '1px solid #eaeaea', marginTop: '20px' }}>
               <div style={{ fontSize: '56px', marginBottom: '16px', opacity: '0.8' }}>📋</div>
               <h3 style={{ color: '#333', fontSize: '20px', marginBottom: '8px' }}>No AI Report Generated</h3>
               <p style={{ fontSize: '15px' }}>An AI damage assessment report has not been generated for this claim yet.</p>
               <p style={{ fontSize: '14px', marginTop: '16px', color: '#999' }}>To generate one, navigate to the AI Report Dashboard section.</p>
            </div>
          )
        ) : (
          <>
            {activeStep === 1 && <UploadStep />}
            {activeStep === 2 && <ReviewStep />}
            {activeStep === 3 && <ReportStep />}
          </>
        )}
      </div>

      {!viewMode && (
        <div className="step-actions">
          {activeStep > 1 && (
            <button 
              className="back-btn"
              onClick={() => setActiveStep(curr => curr - 1)}
              disabled={isLoading}
            >
              Back
            </button>
          )}
          {activeStep < 3 && (
            <button 
              className="next-btn"
            onClick={handleNext}
            disabled={isLoading}
          >
            {isLoading ? "Analyzing..." : "Next"}
          </button>
        )}
      </div>
      )}
    </div>
  );
};

export default AIReport;