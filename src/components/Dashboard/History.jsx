import React, { useState, useEffect } from 'react';
import './History.css';

const History = () => {
  const [historyData, setHistoryData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState(''); // NEW

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('access_token');
        // Fetch reports with mandatory token
        if (!token) {
          setErrorMsg("Session expired. Please log in again.");
          return;
        }

        const res = await fetch('http://localhost:5000/api/reports', {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setHistoryData(data);
          setErrorMsg("");
        } else {
            const errData = await res.json();
            setErrorMsg(`Server Error: ${errData.error || res.status}`);
        }
      } catch (err) {
        console.error("Error fetching history:", err);
        setErrorMsg(`Network Error: Make sure backend is running. Details: ${err.message}`);
      }
    };

    fetchHistory();
  }, []);

  const filteredData = historyData.filter(report =>
    (report.claim_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (report.car_model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (report.claim_recommendation || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="history-container">
      <div className="history-header">
        <h1>Damage Report History</h1>
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Search by car model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {errorMsg && (
          <div style={{ padding: '15px', background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold' }}>
              ⚠️ {errorMsg}
          </div>
      )}

      <div className="history-table">
        <table>
          <colgroup>
            <col className="col-image" />
            <col className="col-image" />
            <col className="col-date" />
            <col className="col-model" />
            <col className="col-cost" />
          </colgroup>
          <thead>
            <tr>
              <th>Damage</th>
              <th>Severity</th>
              <th>Date</th>
              <th>Car Model</th>
              <th>Estimated Cost (PKR)</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((report, reportIndex) => (
                <tr className="history-row" key={reportIndex}>
                  <td className="history-image-cell col-image">
                    <img
                      src={report.parts_image_url ? `http://localhost:5000${report.parts_image_url}` : (report.parts_image_base64 || report.original_image_base64 || '')}
                      alt="Damage"
                    />
                  </td>
                  <td className="history-image-cell col-image">
                    <img
                      src={report.severity_image_url ? `http://localhost:5000${report.severity_image_url}` : (report.severity_image_base64 || report.parts_image_base64 || report.original_image_base64 || '')}
                      alt="Severity"
                    />
                  </td>
                  <td className="history-cell col-date">{report.created_at ? new Date(report.created_at).toLocaleDateString() : (report.date ? new Date(report.date).toLocaleDateString() : 'N/A')}</td>
                  <td className="history-cell col-model">{report.car_model || 'Unknown'}</td>
                  <td className="history-cell col-cost">PKR {report.total_estimated_cost?.toLocaleString() || '0'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-history">
                  No damage reports found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default History;