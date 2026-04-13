import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("allclaims");
  const [search, setSearch] = useState("");

  const fetchClaims = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/claims");
      if (res.ok) {
        const data = await res.json();
        setClaims(data);
      } else {
        console.error("Failed to fetch claims");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleProcessClaim = async (claimId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/claims/${claimId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_status: newStatus })
      });
      if (res.ok) {
        fetchClaims(); // refresh claims
      } else {
        alert("Action failed!");
      }
    } catch (err) {
      console.error(err);
      alert("Error processing claim.");
    }
  };

  const total = claims.length;
  const pending = claims.filter(c => c.status === "Pending").length;
  const approved = claims.filter(c => c.status === "Approved").length;
  const rejected = claims.filter(c => c.status === "Rejected").length;

  const filteredClaims = claims.filter(c => {
    const sTerm = search.toLowerCase();
    const matchesSearch = (c.claim_number?.toLowerCase() || "").includes(sTerm) ||
                          (c.customer_name?.toLowerCase() || "").includes(sTerm);
    
    if (filter === "allclaims") return matchesSearch;
    return matchesSearch && c.status?.toLowerCase() === filter.toLowerCase();
  });

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Review and manage all insurance claims</p>
        </div>
        <div className="admin-profile">
          <div className="profile-info">
            <span className="user-name">Admin User</span>
            <span className="user-role">Administrator</span>
          </div>
          <button
            onClick={() => navigate("/login-selection")}
            className="logout-btn"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Statistics Container */}
      <div className="stats-container">
        {/* Total Claims Card */}
        <div className="stat-card">
          <div className="stat-info">
            <h3>Total Claims</h3>
            <span className="stat-number">{total}</span>
          </div>
          <div className="stat-icon total">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
            </svg>
          </div>
        </div>

        {/* Pending Review Card */}
        <div className="stat-card">
          <div className="stat-info">
            <h3>Pending Review</h3>
            <span className="stat-number">{pending}</span>
          </div>
          <div className="stat-icon pending">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
          </div>
        </div>

        {/* Approved Claims Card */}
        <div className="stat-card">
          <div className="stat-info">
            <h3>Approved</h3>
            <span className="stat-number">{approved}</span>
          </div>
          <div className="stat-icon approved">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
        </div>

        {/* Rejected Claims Card */}
        <div className="stat-card">
          <div className="stat-info">
            <h3>Rejected Claims</h3>
            <span className="stat-number">{rejected}</span>
          </div>
          <div className="stat-icon rejected">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Claims Management Section */}
      <div className="claims-section">
        <div className="claims-header">
          <div>
            <h2>Claims Management</h2>
            <p>Review and approve submitted claims</p>
          </div>
          <div className="claims-actions">
            <div className="search-box">
              <input type="text" placeholder="Search claims..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="status-filter" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="allclaims">All claims</option>
              <option value="rejected">Rejected</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="claims-content">
          {loading ? (
            <div className="loading">Loading claims...</div>
          ) : filteredClaims.length === 0 ? (
            <div className="no-claims">
              <div className="no-claims-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                </svg>
              </div>
              <h3>No Claims Found</h3>
              <p>No claims match your search criteria</p>
            </div>
          ) : (
            <div className="admin-claims-table-wrapper">
              <table className="admin-claims-table">
                <thead>
                  <tr>
                    <th>Claim Number</th>
                    <th>Customer Name</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.claim_number}</strong></td>
                      <td>{c.customer_name}</td>
                      <td>{c.claim_amount ? `Rs. ${c.claim_amount.toLocaleString()}` : '-'}</td>
                      <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${c.status?.toLowerCase()}`}>
                          {c.status || 'Pending'}
                        </span>
                      </td>
                      <td className="action-buttons">
                        <button 
                          className="approve-btn" 
                          disabled={c.status === "Approved"}
                          onClick={() => handleProcessClaim(c.id, "Approved")}
                        >
                          Approve
                        </button>
                        <button 
                          className="reject-btn" 
                          disabled={c.status === "Rejected"}
                          onClick={() => handleProcessClaim(c.id, "Rejected")}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
