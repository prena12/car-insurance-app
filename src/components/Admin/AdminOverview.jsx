import React, { useMemo, useEffect, useState } from 'react';
import './AdminOverview.css';

const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('staff_token');
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds for "real-time" feel
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusProgressData = useMemo(() => {
    if (!stats?.statusCounts) return [];
    const total = stats.totalClaims || 1;
    return [
      { label: 'Approved', count: stats.statusCounts.Approved || 0, color: '#48bb78' },
      { label: 'Pending', count: stats.statusCounts.Pending || 0, color: '#ed8936' },
      { label: 'Rejected', count: stats.statusCounts.Rejected || 0, color: '#e53e3e' }
    ];
  }, [stats]);

  if (loading) return <div className="admin-loading">Syncing Dashboard...</div>;

  return (
    <div className="admin-overview-content">
      <div className="admin-welcome-section">
        <h2>Dashboard Overview</h2>
        <p>Real-time analytics across all insurance claims and processed applications.</p>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-label">Total Claims</div>
          <div className="stat-value">{stats?.totalClaims || 0}</div>
          <div className="stat-trend">Cumulative volume</div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-label">Pending Reviews</div>
          <div className="stat-value">{stats?.statusCounts?.Pending || 0}</div>
          <div className="stat-trend warning">Action required</div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-label">Approved Claims</div>
          <div className="stat-value">{stats?.statusCounts?.Approved || 0}</div>
          <div className="stat-trend success">Successfully processed</div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-label">Rejected Claims</div>
          <div className="stat-value">{stats?.statusCounts?.Rejected || 0}</div>
          <div className="stat-trend danger">Denied applications</div>
        </div>
      </div>

      <div className="admin-dashboard-main">
        <div className="admin-left-col">
          {/* Status Distribution Graph */}
          <div className="admin-chart-card">
            <h3>Claim Status Distribution</h3>
            <div className="admin-bar-chart">
              {statusProgressData.map((item, index) => {
                const maxCount = stats?.totalClaims || 1;
                const percentage = (item.count / maxCount) * 100;
                return (
                  <div key={index} className="admin-bar-item">
                    <span className="bar-label">{item.label}</span>
                    <div className="bar-track">
                      <div 
                        className="bar-fill" 
                        style={{ width: `${percentage}%`, backgroundColor: item.color }}
                      ></div>
                    </div>
                    <span className="bar-count">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Claimed Models Graph */}
          <div className="admin-chart-card" style={{ marginTop: '24px' }}>
            <h3>Top Claimed Vehicle Models</h3>
            <div className="admin-bar-chart">
              {(stats?.topModels || []).map((item, index) => {
                const maxCount = stats.topModels[0]?.count || 1;
                const percentage = (item.count / maxCount) * 100;
                return (
                  <div key={index} className="admin-bar-item">
                    <span className="bar-label">{item.model}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <span className="bar-count">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="admin-right-col">
          {/* Recent Activity Feed */}
          <div className="admin-activity-card">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((activity, idx) => (
                  <div key={idx} className="activity-item">
                    <div className={`activity-icon-dot ${activity.status.toLowerCase()}`}></div>
                    <div className="activity-details">
                      <div className="activity-text">
                        <strong>{activity.claim_number}</strong> was marked as <strong>{activity.status}</strong>
                      </div>
                      <div className="activity-subtext">
                        User: {activity.customer_name} • {new Date(activity.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-activity">No recent status updates</p>
              )}
            </div>
            <div className="activity-footer">
              Showing last 5 system actions
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
