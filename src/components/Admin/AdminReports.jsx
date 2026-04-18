import React, { useState, useEffect, useMemo } from "react";
import html2pdf from "html2pdf.js";
import "./AdminOverview.css"; 
import "../Dashboard/AIReport.css";

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('staff_token') || localStorage.getItem('access_token');
      const res = await fetch("http://localhost:5000/api/admin/all_reports", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error("Error fetching admin reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = useMemo(() => {
    return (reports || []).filter(r => 
      (r.customer_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (r.claim_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (`CLM-${r.id}`).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reports, searchTerm]);

  const [downloadingReport, setDownloadingReport] = useState(null);

  useEffect(() => {
    if (downloadingReport) {
      setTimeout(() => {
        const element = document.getElementById("admin-hidden-pdf");
        if (element) {
          const opt = {
            margin: 10,
            filename: `IntelliClaims_Report_CLM-${downloadingReport.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          
          html2pdf().set(opt).from(element).save().then(() => {
             setDownloadingReport(null);
          });
        }
      }, 500); 
    }
  }, [downloadingReport]);

  const handleDownload = (report) => {
    setDownloadingReport(report);
  };

  return (
    <div className="admin-reports-view">
      <div className="admin-content-header" style={{ marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a202c' }}>Insurance Claim Reports</h2>
          <p style={{ color: '#718096' }}>View and download unified AI damage reports</p>
        </div>
        <div className="admin-table-actions">
          <input 
            type="text" 
            placeholder="Search report by name or #CLM..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="admin-search-input"
            style={{ width: '350px', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}
          />
        </div>
      </div>

      <div className="reports-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {loading ? (
          <div className="loading-state" style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>Loading Reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px', textAlign: 'center', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #cbd5e0' }}>
             No reports found matching your criteria.
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="admin-report-card" style={{ 
              backgroundColor: 'white', 
              padding: '24px', 
              borderRadius: '16px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              border: '1px solid #edf2f7',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div className="report-main-info" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#2d3748' }}>
                    Report #{report.claim_number || `CLM-${report.id + 1000}`} — {report.customer_name}
                  </h3>
                </div>
                <div style={{ color: '#718096', fontSize: '14px', marginBottom: '20px' }}>
                  {report.car_model || 'Vehicle Info N/A'} | Submitted: {new Date(report.created_at).toLocaleDateString()} | Policy: {report.policy_no || 'TPL-POL-001'}
                </div>

                <div className="report-damage-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#a0aec0', textTransform: 'uppercase', marginBottom: '8px' }}>Damaged Parts</div>
                    <div style={{ color: '#4a5568', fontSize: '15px', lineHeight: '1.6' }}>
                      {report.damaged_parts && report.damaged_parts.length > 0 
                        ? report.damaged_parts.map(p => p.part_name).join(', ') 
                        : 'No specific part damage detected'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#a0aec0', textTransform: 'uppercase', marginBottom: '8px' }}>Estimated Cost</div>
                    <div style={{ color: '#e53e3e', fontSize: '18px', fontWeight: '700' }}>
                      PKR {report.total_estimated_cost ? report.total_estimated_cost.toLocaleString() : '0'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="report-actions" style={{ marginLeft: '40px', textAlign: 'right' }}>
                 <button 
                   onClick={() => handleDownload(report)}
                   style={{ 
                     backgroundColor: 'transparent', 
                     border: 'none', 
                     color: '#f97316', 
                     fontWeight: '600', 
                     fontSize: '14px', 
                     cursor: 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '6px'
                   }}
                 >
                   <span>⬇️</span> Download PDF
                 </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Hidden container to generate exact PDF replica */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none', opacity: 0 }}>
        {downloadingReport && (
          <div id="admin-hidden-pdf" style={{ width: '800px', padding: '20px', background: 'white' }}>
            <div className="report-claim-summary" style={{ marginBottom: '20px', padding: '16px', border: '1px solid #e4e4e4', borderRadius: '12px', background: '#fbfbfb' }}>
              <h3 style={{ marginBottom: '12px' }}>Submitted Claim Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div><strong>Claim No:</strong> {downloadingReport.claim_number || `CLM-${downloadingReport.id + 1000}`}</div>
                <div><strong>Name:</strong> {downloadingReport.customer_name || 'Unknown'}</div>
                <div><strong>Policy No:</strong> {downloadingReport.policy_no || 'N/A'}</div>
                <div><strong>Date:</strong> {new Date(downloadingReport.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="report-card">
              <div className="report-card-header">
                <div>
                  <p className="report-card-title">Vehicle Damage Report</p>
                  <p className="report-card-date">Generated on {new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}</p>
                </div>
              </div>

              <div className="report-grid-two report-summary-grid">
                <div className="report-panel">
                  <p className="panel-heading">Vehicle Info</p>
                  <div className="report-item"><span>Model:</span><span>{downloadingReport.car_model || 'Unknown'}</span></div>
                </div>
                <div className="report-panel report-summary-panel">
                  <p className="panel-heading">Damage Summary</p>
                  <div className="summary-cost">
                    <span>Estimated Repair Cost:</span>
                    <strong>PKR {downloadingReport.total_estimated_cost?.toLocaleString() || '0'}</strong>
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
                  {downloadingReport.damaged_parts?.length ? (
                    downloadingReport.damaged_parts.map((part, idx) => (
                      <div className="report-table-row" key={idx}>
                        <div>{part.part_name}</div>
                        <div>{part.severity}</div>
                        <div>{part.estimated_cost?.toLocaleString() || '0'}</div>
                      </div>
                    ))
                  ) : (
                    <div className="report-table-row empty-row">No damages detected.</div>
                  )}
                  <div className="report-table-footer">
                    <span>Total:</span>
                    <strong>PKR {downloadingReport.total_estimated_cost?.toLocaleString() || '0'}</strong>
                  </div>
                </div>
              </div>

              <div className="report-grid-two report-images-grid">
                <div className="report-image-block">
                  <p>Detected Parts</p>
                  <img src={downloadingReport.parts_image_url ? `http://localhost:5000${downloadingReport.parts_image_url}` : ''} alt="Detected Parts" style={{maxWidth: '100%'}}/>
                </div>
                <div className="report-image-block">
                  <p>Severity Map</p>
                  <img src={downloadingReport.severity_image_url ? `http://localhost:5000${downloadingReport.severity_image_url}` : ''} alt="Severity Map" style={{maxWidth: '100%'}}/>
                </div>
              </div>

              <div className="report-note">
                <strong>Note:</strong> This is an AI-generated report. Please verify with a certified expert.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReports;
