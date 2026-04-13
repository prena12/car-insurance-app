import React, { useState, useEffect } from 'react';
import './History.css';

const History = () => {
  const [historyData, setHistoryData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Load history from localStorage
    const storedHistory = JSON.parse(localStorage.getItem('damageReports') || '[]');
    setHistoryData(storedHistory);
  }, []);

  const filteredData = historyData.filter(report =>
    report.car_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.damaged_parts?.some(part => 
      part.part_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
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
                      src={report.parts_image_base64 || report.original_image_base64 || ''}
                      alt="Damage"
                    />
                  </td>
                  <td className="history-image-cell col-image">
                    <img
                      src={report.severity_image_base64 || report.parts_image_base64 || report.original_image_base64 || ''}
                      alt="Severity"
                    />
                  </td>
                  <td className="history-cell col-date">{new Date(report.date).toLocaleDateString()}</td>
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