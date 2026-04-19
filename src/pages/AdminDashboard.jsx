import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../components/Admin/AdminSidebar";
import AdminOverview from "../components/Admin/AdminOverview";
import AdminPolicies from "../components/Admin/AdminPolicies";
import AdminReports from "../components/Admin/AdminReports";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("allclaims");
  const [search, setSearch] = useState("");

  const [reviewData, setReviewData] = useState(null);
  const [viewOnlyData, setViewOnlyData] = useState(null);



  // Read from localStorage
  const staffRole = localStorage.getItem('staff_role') || 'employee';
  const staffName = localStorage.getItem('staff_name') || 'Staff Member';
  const staffId   = localStorage.getItem('staff_id') || '';
  const isManager = staffRole === 'manager';
  const staffToken = localStorage.getItem('staff_token') || localStorage.getItem('access_token');

  const fetchClaims = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/claims", {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      if (res.ok) setClaims(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };


  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('staff_token');
    if (!token) { navigate('/login-selection', { replace: true }); return; }
    fetchClaims();
  }, [navigate]);


  // Only managers can process claims
  const handleProcessClaimClick = (claimId, newStatus) => {
    if (!isManager) return;
    setReviewData({ claimId, newStatus, reason: "" });
  };

  const handleConfirmProcess = async () => {
    if (!isManager || !reviewData) return;
    const { claimId, newStatus, reason } = reviewData;
    if (!reason.trim()) {
      alert("Please provide a reason before confirming.");
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:5000/api/admin/claims/${claimId}/process`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${staffToken}`
        },
        body: JSON.stringify({ new_status: newStatus, admin_remarks: reason })
      });
      if (res.ok) {
        setReviewData(null);
        fetchClaims();
      } else alert("Action failed!");
    } catch (err) { alert("Error processing claim."); }
  };



  const handleLogout = () => {
    ['access_token','staff_token','staff_role','staff_name','staff_id','user_role','user'].forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    navigate('/login-selection', { replace: true });
  };

  const filteredClaims = claims.filter(c => {
    const sTerm = search.toLowerCase();
    const matchesSearch = (c.claim_number?.toLowerCase() || "").includes(sTerm) ||
                          (c.customer_name?.toLowerCase() || "").includes(sTerm);
    if (filter === "allclaims") return matchesSearch;
    return matchesSearch && c.status?.toLowerCase() === filter.toLowerCase();
  });



  // ── Main Content ──────────────────────────────────────────────
  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return <AdminOverview />;

      case 'claims':
        return (
          <div className="admin-claims-management">
            <div className="admin-content-header">
              <div>
                <h2>Claims Management</h2>
                <p>{isManager ? "Review and process insurance claims" : "View insurance claims — read only access"}</p>
              </div>

              {!isManager && (
                <div style={{
                  background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)",
                  borderRadius: "20px", padding: "8px 18px", color: "#60a5fa",
                  fontWeight: 600, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px"
                }}>
                  👁️ View Only Mode
                </div>
              )}

              <div className="admin-table-actions">
                <input type="text" placeholder="Search claims..." value={search}
                  onChange={e => setSearch(e.target.value)} className="admin-search-input" />
                <select className="admin-status-select" value={filter} onChange={e => setFilter(e.target.value)}>
                  <option value="allclaims">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="admin-table-container">
              {loading ? (
                <div className="loading-state">Loading claims...</div>
              ) : filteredClaims.length === 0 ? (
                <div className="empty-state">No claims found</div>
              ) : (
                <table className="modern-admin-table">
                  <thead>
                    <tr>
                      <th>Claim No</th><th>Customer</th><th>Vehicle</th><th>Date</th><th>Status</th>
                      {isManager && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClaims.map(c => (
                      <tr key={c.id}>
                        <td><strong>{c.claim_number}</strong></td>
                        <td>{c.customer_name}</td>
                        <td>{c.vehicle_type || c.vehicle_make} ({c.year_of_manufacture})</td>
                        <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <span className={`status-pill ${c.status?.toLowerCase()}`}>
                            {c.status || 'Pending'}
                          </span>
                        </td>
                        {isManager && (
                          <td className="admin-actions">
                            {c.status === "Pending" ? (
                              <>
                                <button className="btn-approve" onClick={() => handleProcessClaimClick(c.id, "Approved")}>Approve</button>
                                <button className="btn-reject" onClick={() => handleProcessClaimClick(c.id, "Rejected")}>Reject</button>
                              </>
                            ) : (
                              <button style={{ background: 'none', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', color: '#4a5568' }} onClick={() => setViewOnlyData(c)}>
                                View Details
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Review Reason Modal */}
            {reviewData && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 16px 0', color: '#1a202c' }}>Confirm {reviewData.newStatus}</h3>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '8px' }}>Reason / Remarks (Required)</label>
                    <textarea 
                      value={reviewData.reason} 
                      onChange={e => setReviewData({...reviewData, reason: e.target.value})}
                      placeholder="Explain your decision..."
                      style={{ width: '100%', minHeight: '100px', padding: '12px', boxSizing: 'border-box', border: '1px solid #cbd5e0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setReviewData(null)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e0', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                    <button onClick={handleConfirmProcess} style={{ padding: '8px 16px', background: reviewData.newStatus === 'Approved' ? '#f97316' : '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                      Confirm {reviewData.newStatus}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* View Details Modal for Processed Claims */}
            {viewOnlyData && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setViewOnlyData(null)}>
                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: '#1a202c' }}>Claim Details</h3>
                    <button onClick={() => setViewOnlyData(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#a0aec0' }}>&times;</button>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}><strong>Claim No:</strong> {viewOnlyData.claim_number}</p>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}><strong>Status:</strong> <span className={`status-pill ${viewOnlyData.status?.toLowerCase()}`}>{viewOnlyData.status}</span></p>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #edf2f7' }}>
                    <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', color: '#a0aec0', marginBottom: '8px' }}>Admin Remarks</label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#2d3748', lineHeight: '1.5' }}>
                      {viewOnlyData.admin_remarks || 'No remarks provided.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        );

      case 'policies': return <AdminPolicies />;
      case 'reports':  return <AdminReports />;

      default: return null;
    }
  };

  const roleBadge = isManager
    ? { bg: "rgba(249,115,22,0.15)", border: "rgba(249,115,22,0.3)", color: "#f97316", icon: "👑", label: "Manager" }
    : { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", color: "#60a5fa", icon: "👁️", label: "Employee" };

  return (
    <div className="admin-layout">
      <AdminSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onLogout={handleLogout}
        isManager={isManager}
      />
      <main className="admin-main-view">
        <header className="admin-top-bar">
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span className="welcome-msg">Welcome, {staffName}</span>

          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              background: roleBadge.bg, border: `1px solid ${roleBadge.border}`,
              borderRadius: "20px", padding: "6px 14px",
              color: roleBadge.color, fontWeight: 600, fontSize: "13px",
              display: "flex", alignItems: "center", gap: "6px"
            }}>
              {roleBadge.icon} {roleBadge.label}
            </div>
            <div className="admin-user-info">
              <div className="admin-avatar" style={{
                background: isManager
                  ? "linear-gradient(135deg,#f97322,#ea580c)"
                  : "linear-gradient(135deg,#3b82f6,#2563eb)"
              }}>
                {staffName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>
        <div className="admin-view-inner">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
