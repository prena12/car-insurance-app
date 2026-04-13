import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import './ClaimsList.css';

const ClaimsList = ({ refresh = 0, searchTerm = '', onOpenAIReport = () => { } }) => {
  const { user } = useUser();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLocalClaims = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('localClaims') || '[]');
      const parsed = Array.isArray(saved) ? saved : [];
      if (!user?.email) return [];
      return parsed.filter(c => (c.email || '').toLowerCase() === user.email.toLowerCase());
    } catch (err) {
      console.error('Error loading local claims:', err);
      return [];
    }
  };

  const [filteredClaims, setFilteredClaims] = useState([]);

  const fetchClaims = async () => {
    setLoading(true);
    setError('');

    const token = localStorage.getItem('access_token');
    const email = user?.email;
    const localClaims = loadLocalClaims();

    if (!token && !email) {
      setClaims(localClaims);
      setLoading(false);
      return;
    }

    try {
      let url = 'http://localhost:5000/api/admin/claims';
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
      const localClaims = loadLocalClaims();

      // Merge backend data over localClaims to ensure updated statuses override local
      const mergedMap = new Map();
      localClaims.forEach(c => {
        const id = c.claim_number || c.claimNumber;
        if (id) mergedMap.set(id, c);
      });

      data.forEach(c => {
        const id = c.claim_number || c.claimNumber;
        if (id) mergedMap.set(id, c); // Backend overrides local
      });

      const finalClaims = Array.from(mergedMap.values());

      // Sort by date descending
      finalClaims.sort((a, b) => {
        const dateA = a.created_at || a.date_time || a.date;
        const dateB = b.created_at || b.date_time || b.date;
        return new Date(dateB) - new Date(dateA);
      });

      setClaims(finalClaims);
    } catch (err) {
      console.error('Error fetching claims:', err);
      setError(err.message || 'Could not load claims. Showing saved local claims.');
      setClaims(localClaims);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 10 seconds to pick up status changes from admin
  useEffect(() => {
    if (user) {
      fetchClaims();
    }
    const interval = setInterval(() => {
      if (user) fetchClaims();
    }, 10000);
    return () => clearInterval(interval);
  }, [user, refresh]);

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
          <td>{amount}</td>
          <td>
            <span className={`status ${getStatusClass(status)}`}>
              {status}
            </span>
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
      <div className="table-container">
        <table className="claims-table">
          <thead>
            <tr>
              <th>Claim Number</th>
              <th>Customer Name</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
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
    </div>
  );
};

export default ClaimsList;