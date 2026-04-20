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
  const [error, setError] = useState(null);

  // Check if claim has existing report when component mounts
  React.useEffect(() => {
    // CRITICAL: Always clear previous report data when switching claims or entering a new view
    setAssessmentReport(null);
    setCarModel("");
    setError(null);
    
    const fetchExistingReport = async () => {
      if (selectedClaim) {
        try {
        let token = localStorage.getItem('access_token');
        
        // AUTO-RESCUE
        if (!token) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userObj = JSON.parse(userStr);
                try {
                    const syncRes = await fetch('http://localhost:5000/api/auth/sync_firebase', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            email: userObj.email, 
                            uid: userObj.uid || userObj.id, 
                            firstName: userObj.firstName || userObj.first_name, 
                            lastName: userObj.lastName || userObj.last_name 
                        })
                    });
                    if (syncRes.ok) {
                        const syncData = await syncRes.json();
                        token = syncData.access_token;
                        if (token) localStorage.setItem('access_token', token);
                    }
                } catch (e) {
                    console.log("Auto-rescue token fetch failed", e);
                }
            }
        }
        
        if (!token) return;

          const res = await fetch('http://localhost:5000/api/reports', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            const savedReports = await res.json();
            // Match strictly by claim ID (reliable) or claim number (fallback)
            const sId = selectedClaim.id;
            const sNum = selectedClaim.claim_number || selectedClaim.claimNumber;
            
            const filteredReports = savedReports.filter(report => {
              const rId = report.claim_id;
              const rNum = report.claim_number;
              
              if (sId && rId && sId === rId) return true;
              const isValidNumber = (num) => num && num !== "N/A" && num !== "NULL";
              if (isValidNumber(sNum) && isValidNumber(rNum) && sNum === rNum) return true;
              return false;
            });

            // Always take the LATEST report (highest ID or latest created_at)
            if (filteredReports.length > 0) {
              const latestByDate = [...filteredReports].sort((a, b) => 
                new Date(b.created_at || 0) - new Date(a.created_at || 0)
              );
              const latestReport = latestByDate[0];
              setAssessmentReport(latestReport);
              setViewMode(true);
              setIsLoading(false);
            } else {
              setAssessmentReport(null);
              setViewMode(false);
              setIsLoading(false);
            }
          }
        } catch (err) {
          console.error("Error loading claim report:", err);
        }
      } else {
        setIsLoading(false);
      }
    };
    
    fetchExistingReport();
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

  const downloadPDF = async () => {
    if (!assessmentReport) return;
    
    try {
      const element = document.querySelector('#pdf-content-wrapper');
      if (!element) return;
      
      const opt = {
        margin:       10,
        filename:     `IntelliClaims_Report_${assessmentReport.id || 'New'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Extract raw DOM element to PDF instead of hitting backend (so it looks 100% like the UI)
      html2pdf().set(opt).from(element).save();
      
    } catch (e) {
      console.error("Error generating PDF:", e);
      alert("Error generating PDF from screen.");
    }
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
      
      {(assessmentReport?.original_image_base64 || assessmentReport?.original_image_url) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px', marginBottom: '20px' }}>
          <div className="damage-card">
             <span className="damage-label">Uploaded</span>
             <img className="damage-image" src={assessmentReport.original_image_url ? `http://localhost:5000${assessmentReport.original_image_url}` : assessmentReport.original_image_base64} alt="Original" />
          </div>
          <div className="damage-card">
             <span className="damage-label">Parts detection</span>
             <img className="damage-image" src={assessmentReport.parts_image_url ? `http://localhost:5000${assessmentReport.parts_image_url}` : assessmentReport.parts_image_base64} alt="Parts detection" />
          </div>
          <div className="damage-card">
             <span className="damage-label">Severity map</span>
             <img className="damage-image" src={assessmentReport.severity_image_url ? `http://localhost:5000${assessmentReport.severity_image_url}` : assessmentReport.severity_image_base64} alt="Severity map" />
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
            <div className="assessment-table-header">
              <div>Damaged parts</div>
              <div>Severity</div>
              <div style={{ textAlign: 'right' }}>Cost</div>
            </div>
            <div className="table-rows">
              {assessmentReport?.damaged_parts?.length ? assessmentReport.damaged_parts.map((part, idx) => (
                <div className="assessment-table-row" key={idx}>
                  <div>{part.part_name}</div>
                  <div>{part.severity}</div>
                  <div style={{ textAlign: 'right' }}>PKR {part.estimated_cost.toLocaleString()}</div>
                </div>
              )) : (
                <div className="assessment-table-row empty-row">
                  <div>No damaged parts detected</div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="assessment-table-footer" style={{ textAlign: 'left', padding: '16px 35px', background: '#fff3e8', borderTop: '1px solid #fce4d0' }}>
          <span style={{ color: '#ff8a00', fontWeight: 'bold', fontSize: '15px' }}>
            Total estimated repair cost: PKR {assessmentReport?.total_estimated_cost?.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );

  const ReportStep = () => {
    // Use the report's actual date if it's an existing report, otherwise use today
    const reportDateStr = assessmentReport?.created_at || assessmentReport?.date || new Date().toISOString();
    const generatedDate = new Date(reportDateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    return (
      <div className="report-step">
        <h2>Generate Report</h2>

        <div id="pdf-content-wrapper">
          {selectedClaim && (
            <div className="report-claim-summary" style={{ marginBottom: '20px', padding: '16px', border: '1px solid #e4e4e4', borderRadius: '12px', background: '#fbfbfb' }}>
              <h3 style={{ marginBottom: '12px' }}>Submitted Claim Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div><strong>Claim No:</strong> {selectedClaim.claim_number || selectedClaim.claimNumber || 'N/A'}</div>
                <div><strong>Name:</strong> {assessmentReport?.customer_name || selectedClaim?.name || selectedClaim?.email || 'Unknown'}</div>
                <div><strong>Policy No:</strong> {selectedClaim.policy_no || 'N/A'}</div>
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
              <button data-html2canvas-ignore="true" className="download-btn" onClick={downloadPDF}>
                Download PDF
              </button>
            </div>

          <div className="report-grid-two report-summary-grid">
            <div className="report-panel">
              <p className="panel-heading">Vehicle Info</p>
              <div className="report-item"><span>Model:</span><span>{assessmentReport?.car_model || 'Unknown'}</span></div>
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
              <img src={assessmentReport?.parts_image_url ? `http://localhost:5000${assessmentReport.parts_image_url}` : assessmentReport?.parts_image_base64} alt="Detected Parts" />
            </div>
            <div className="report-image-block">
              <p>Severity Map</p>
              <img src={assessmentReport?.severity_image_url ? `http://localhost:5000${assessmentReport.severity_image_url}` : assessmentReport?.severity_image_base64} alt="Severity Map" />
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
              <button className="link-button" onClick={() => {
                setAssessmentReport(null);
                setCarModel("");
                setSelectedFile(null);
                setViewMode(false);
                setActiveStep(1);
              }}>Re-upload image</button>
              <button className="link-button" onClick={onNavigateToHistory}>View History</button>
            </div>
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
      if (selectedClaim?.id) {
        formData.append("claim_id", selectedClaim.id);
      }

      try {
        let token = localStorage.getItem("access_token"); 
        
        // AUTO-RESCUE
        if (!token) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userObj = JSON.parse(userStr);
                try {
                    const syncRes = await fetch('http://localhost:5000/api/auth/sync_firebase', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            email: userObj.email, 
                            uid: userObj.uid || userObj.id, 
                            firstName: userObj.firstName || userObj.first_name, 
                            lastName: userObj.lastName || userObj.last_name 
                        })
                    });
                    if (syncRes.ok) {
                        const syncData = await syncRes.json();
                        token = syncData.access_token;
                        if (token) localStorage.setItem('access_token', token);
                    }
                } catch (e) {
                    console.log("Auto-rescue token fetch failed", e);
                }
            }
        }
        
        if (!token) {
            alert("Your session token is expired. Please fully LOGOUT from the left menu and LOGIN again.");
            setIsLoading(false);
            return;
        }
        
        const response = await fetch("http://localhost:5000/api/assess_damage", {
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

      {(!viewMode || (viewMode && activeStep < 3)) && (
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