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
  const handleProcessClaim = async (claimId, newStatus) => {
    if (!isManager) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/claims/${claimId}/process`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${staffToken}`
        },
        body: JSON.stringify({ new_status: newStatus })
      });
      if (res.ok) fetchClaims();
      else alert("Action failed!");
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
                            <button className="btn-approve" disabled={c.status === "Approved"}
                              onClick={() => handleProcessClaim(c.id, "Approved")}>Approve</button>
                            <button className="btn-reject" disabled={c.status === "Rejected"}
                              onClick={() => handleProcessClaim(c.id, "Rejected")}>Reject</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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
