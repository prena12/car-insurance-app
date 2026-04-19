import React, { useState, useEffect, useMemo } from "react";
import "./AdminOverview.css"; 

const AdminPolicies = () => {
  const [data, setData] = useState({ policies: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedPolicy, setSelectedPolicy] = useState(null);

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
                      <button onClick={() => setSelectedPolicy(p)} style={{ 
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

      {/* Modern Detailed Views Modal overlay */}
      {selectedPolicy && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }} onClick={() => setSelectedPolicy(null)}>
          
          <div style={{
            background: 'white', borderRadius: '16px', width: '500px', maxWidth: '90%',
            overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', cursor: 'default'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ background: '#f8fafc', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Policy Details
                  <span className={`status-pill ${selectedPolicy.status?.toLowerCase() === 'active' ? 'approved' : 'rejected'}`} style={{ fontSize: '11px', marginLeft: '8px' }}>
                    {selectedPolicy.status || 'Active'}
                  </span>
                </h3>
                <p style={{ margin: '4px 0 0', color: '#718096', fontSize: '13px' }}>{selectedPolicy.policy_number}</p>
              </div>
              <button onClick={() => setSelectedPolicy(null)} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#a0aec0', cursor: 'pointer' }}>&times;</button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '24px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div style={{ background: '#fcfcfd', padding: '16px', borderRadius: '12px', border: '1px solid #edf2f7' }}>
                   <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', fontWeight: 'bold' }}>👤 Policy Holder</div>
                   <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>{selectedPolicy.user_name}</div>
                   <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '2px' }}>📧 {selectedPolicy.email}</div>
                   <div style={{ fontSize: '13px', color: '#4a5568' }}>📞 {selectedPolicy.phone || 'Not provided'}</div>
                </div>

                <div style={{ background: '#fcfcfd', padding: '16px', borderRadius: '12px', border: '1px solid #edf2f7' }}>
                   <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', fontWeight: 'bold' }}>🚗 Vehicle Info</div>
                   <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>{selectedPolicy.vehicle} ({selectedPolicy.model_year})</div>
                   <div style={{ fontSize: '13px', color: '#4a5568' }}>Reg No: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedPolicy.registration_no || 'N/A'}</span></div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e0' }}>
                   <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', fontWeight: 'bold' }}>📅 Policy Duration</div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4a5568', marginBottom: '8px' }}>
                      <span>Start Date:</span>
                      <strong style={{ color: '#2d3748' }}>{selectedPolicy.start_date ? new Date(selectedPolicy.start_date).toLocaleDateString() : 'N/A'}</strong>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4a5568' }}>
                      <span>End Date:</span>
                      <strong style={{ color: '#2d3748' }}>{selectedPolicy.end_date ? new Date(selectedPolicy.end_date).toLocaleDateString() : 'N/A'}</strong>
                   </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPolicies;
