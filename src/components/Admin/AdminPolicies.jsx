import React, { useState, useEffect, useMemo } from "react";
import "./AdminOverview.css"; 

const AdminPolicies = () => {
  const [data, setData] = useState({ policies: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPolicies = async () => {
    try {
      const token = localStorage.getItem('staff_token') || localStorage.getItem('access_token');
      const res = await fetch("http://localhost:5000/api/admin/policies", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error("Error fetching policies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const getInitials = (name) => {
    if (!name) return "??";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (initials) => {
    const colors = ["#e6fffa", "#ebf8ff", "#fff5f5", "#fefcbf", "#faf5ff", "#fffaf0"];
    const textColors = ["#2c7a7b", "#2b6cb0", "#c53030", "#b7791f", "#6b46c1", "#c05621"];
    const index = initials.charCodeAt(0) % colors.length;
    return { bg: colors[index], text: textColors[index] };
  };

  const filteredPolicies = useMemo(() => {
    return (data.policies || []).filter(p => 
      (p.user_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (p.policy_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (p.registration_no?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );
  }, [data.policies, searchTerm]);

  return (
    <div className="admin-policies-view">
      {/* Top Stats Cards */}
      <div className="admin-stats-grid" style={{ marginBottom: '40px' }}>
        <div className="admin-stat-card">
          <div className="stat-label">Total Insured</div>
          <div className="stat-value">{data.stats?.total_insured || 0}</div>
          <div className="stat-trend success">+5% this month</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Active Policies</div>
          <div className="stat-value">{data.stats?.active_policies || 0}</div>
          <div className="stat-trend success">Valid coverage</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Expired Policies</div>
          <div className="stat-value">{data.stats?.expired_policies || 0}</div>
          <div className="stat-trend warning">Renewals needed</div>
        </div>
      </div>

      <div className="admin-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>All Insured Users</h2>
        <div className="admin-table-actions">
          <input 
            type="text" 
            placeholder="Search by name, policy, or reg..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="admin-search-input"
            style={{ width: '320px' }}
          />
        </div>
      </div>

      <div className="admin-table-container">
        {loading ? (
          <div className="loading-state">Syncing policy Holders...</div>
        ) : filteredPolicies.length === 0 ? (
          <div className="empty-state">No insured users found in database</div>
        ) : (
          <table className="modern-admin-table">
            <thead>
              <tr>
                <th style={{ width: '250px' }}>NAME</th>
                <th>POLICY NO</th>
                <th>VEHICLE</th>
                <th>POLICY</th>
                <th>CLAIMS</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredPolicies.map(p => {
                const initials = getInitials(p.user_name);
                const colors = getAvatarColor(initials);
                return (
                  <tr key={p.policy_number}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '50%', 
                          backgroundColor: colors.bg, 
                          color: colors.text,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: '700'
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#1a202c' }}>{p.user_name}</div>
                          <div style={{ fontSize: '12px', color: '#718096' }}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#4a5568', fontWeight: '500' }}>{p.policy_number}</td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{p.vehicle}</div>
                      <div style={{ fontSize: '12px', color: '#718096' }}>{p.model_year}</div>
                    </td>
                    <td>
                      <span className={`status-pill ${p.status?.toLowerCase() === 'active' ? 'approved' : 'rejected'}`} style={{ fontSize: '11px' }}>
                        {p.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#2d3748' }}>
                      {p.claim_count || 0}
                    </td>
                    <td>
                      <button style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: '#f97316', 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        cursor: 'pointer',
                        padding: '4px 8px'
                      }}>
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminPolicies;
