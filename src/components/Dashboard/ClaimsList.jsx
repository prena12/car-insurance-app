import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../contexts/UserContext';
import './ClaimsList.css';

const ClaimsList = ({ refresh = 0, searchTerm = '', onOpenAIReport = () => { } }) => {
  const { user } = useUser();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewReasonData, setViewReasonData] = useState(null);

  const [filteredClaims, setFilteredClaims] = useState([]);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError('');

    const token = localStorage.getItem('access_token');
    const email = user?.email;

    if (!token && !email) {
      setClaims([]);
      setLoading(false);
      return;
    }

    try {
      let url = 'http://localhost:5000/api/claims';
      let options = { headers: {} };

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || 'Failed to load claims.');
      }

      const data = await response.json();

      // Sort by date descending
      data.sort((a, b) => {
        const dateA = a.created_at || a.date_time || a.date;
        const dateB = b.created_at || b.date_time || b.date;
        return new Date(dateB) - new Date(dateA);
      });

      setClaims(data);
    } catch (err) {
      console.error('Error fetching claims:', err);
      setError(err.message || 'Could not load claims from database.');
      setClaims([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refresh]);

  // Load claims once on mount and when refresh counter changes (no auto-polling)
  useEffect(() => {
    if (user) {
      fetchClaims();
    }
  }, [fetchClaims]);

  useEffect(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    if (!normalizedTerm) {
      setFilteredClaims(claims);
      return;
    }

    const filtered = claims.filter((claim) => {
      const claimNumber = (claim.claim_number || claim.claimNumber || '').toLowerCase();
      const customerName = ((claim.name || claim.customer_name || claim.email || '')).toLowerCase();
      return claimNumber.includes(normalizedTerm) || customerName.includes(normalizedTerm);
    });

    setFilteredClaims(filtered);
  }, [claims, searchTerm]);

  const getStatusClass = (status) => {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s === 'approved') return 'approved';
    if (s === 'rejected') return 'rejected';
    return 'pending';
  };

  const renderClaimRows = () => {
    return filteredClaims.map((claim) => {
      const customerName = claim.name || claim.customer_name || claim.email || 'Unknown';
      const createdAt = claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'N/A';
      const amount = claim.claim_amount ? `Rs. ${claim.claim_amount.toLocaleString()}` : '-';
      const status = claim.status || 'Pending';

      return (
        <tr key={claim.id || claim.claim_number || Math.random()}>
          <td>{claim.claim_number || claim.claimNumber || 'N/A'}</td>
          <td>{customerName}</td>
          <td>{createdAt}</td>
          <td>
            <span className={`status ${getStatusClass(status)}`}>
              {status}
            </span>
          </td>
          <td>
            {status !== 'Pending' && (
              <button onClick={() => setViewReasonData(claim)} style={{ background: '#f8fafc', border: '1px solid #cbd5e0', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', color: '#2d3748' }}>
                View
              </button>
            )}
          </td>
          <td>
            <button className="ai-report-btn" onClick={() => onOpenAIReport(claim)}>
              AI Report
            </button>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="claims-list">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <button 
          onClick={() => fetchClaims()} 
          style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '6px 14px', color: '#f97316', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
        >
          🔄 Refresh
        </button>
      </div>
      <div className="table-container">
        <table className="claims-table">
          <thead>
            <tr>
              <th>Claim Number</th>
              <th>Customer Name</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
              <th>AI Report</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="loading">Loading claims...</td>
              </tr>
            ) : filteredClaims.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-claims">
                  No claims match your search. Submit a new claim to display it here.
                </td>
              </tr>
            ) : (
              renderClaimRows()
            )}
          </tbody>
        </table>
        {error && !loading && (
          <div className="error-message">{error}</div>
        )}
      </div>

      {viewReasonData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setViewReasonData(null)}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#1a202c' }}>Claim Update</h3>
              <button onClick={() => setViewReasonData(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#a0aec0' }}>&times;</button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}><strong>Claim No:</strong> {viewReasonData.claim_number || viewReasonData.claimNumber}</p>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}><strong>Status:</strong> <span className={`status ${getStatusClass(viewReasonData.status)}`}>{viewReasonData.status}</span></p>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #edf2f7' }}>
              <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', color: '#a0aec0', marginBottom: '8px' }}>Admin Official Reason</label>
              <p style={{ margin: 0, fontSize: '14px', color: '#2d3748', lineHeight: '1.5' }}>
                {viewReasonData.admin_remarks || 'Your claim has been processed by our team.'}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClaimsList;