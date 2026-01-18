import React, { useMemo, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import './Overview.css';

const Overview = () => {
  const { user } = useUser();

  // Debug log
  useEffect(() => {
    console.log("Overview - Current user:", user);
  }, [user]);

  // Get user initials for avatar
  const userInitials = useMemo(() => {
    if (!user) return "CM";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return ((firstName[0] || "") + (lastName[0] || "")).toUpperCase() || "CM";
  }, [user]);

  const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Claims Manager";
  const userEmail = user?.email || "user@example.com";

  return (
    <div className="overview-container">
      <header className="overview-header">
        <div className="header-left">
          <h1>Welcome back, {userName}!</h1>
          <p>Have a great day managing claims</p>
        </div>
        <div className="header-right">
          <button className="notification-btn">🔔</button>
          <div className="user-avatar">{userInitials}</div>
        </div>
      </header>

      <div className="overview-content">
        {/* User Profile Card */}
        <div className="user-profile-card">
          <div className="profile-avatar">{userInitials}</div>
          <div className="profile-info">
            <h2>{userName}</h2>
            <p className="profile-role">Employee</p>
            <div className="profile-contact">
              <span>📧 {userEmail}</span>
              <span>📱 N/A</span>
              <span>🌍 N/A</span>
            </div>
          </div>
          <div className="profile-status">
            <span className="status-badge">Active</span>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <h3>Total Claims Submitted</h3>
              <p className="stat-number">3</p>
              <span className="stat-period">Today</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔧</div>
            <div className="stat-content">
              <h3>Top Damaged Part</h3>
              <p className="stat-number">damaged_bumper</p>
              <span className="stat-period">Most recent claim</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>Top Severity</h3>
              <p className="stat-number">Moderate</p>
              <span className="stat-period">Today</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>Estimated Repair Cost</h3>
              <p className="stat-number">Rs 333,790</p>
              <span className="stat-period">Total</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="chart-row">
          <div className="chart-card">
            <h3>Top 5 Most Claimed Models</h3>
            <div className="chart-placeholder">
              <div className="bar-chart">
                <div className="bar-item">
                  <span className="bar-label">Suzuki Cultus</span>
                  <div className="bar-container">
                    <div className="bar" style={{ width: '80%' }}></div>
                  </div>
                </div>
                <div className="bar-item">
                  <span className="bar-label">Toyota Corolla</span>
                  <div className="bar-container">
                    <div className="bar" style={{ width: '70%' }}></div>
                  </div>
                </div>
                <div className="bar-item">
                  <span className="bar-label">Toyota Corolla XLI/GLI</span>
                  <div className="bar-container">
                    <div className="bar" style={{ width: '65%' }}></div>
                  </div>
                </div>
                <div className="bar-item">
                  <span className="bar-label">Honda Civic</span>
                  <div className="bar-container">
                    <div className="bar" style={{ width: '55%' }}></div>
                  </div>
                </div>
                <div className="bar-item">
                  <span className="bar-label">Changan Alsvin</span>
                  <div className="bar-container">
                    <div className="bar" style={{ width: '50%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <h3>Repair Cost Timeline (Daywise - Top 3 Models)</h3>
            <div className="chart-placeholder line-chart">
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                <polyline points="20,150 100,100 200,80 300,120" fill="none" stroke="#1a73e8" strokeWidth="2" />
                <polyline points="20,160 100,140 200,120 300,100" fill="none" stroke="#f97316" strokeWidth="2" />
                <polyline points="20,140 100,110 200,130 300,110" fill="none" stroke="#34a853" strokeWidth="2" />
                <circle cx="20" cy="150" r="3" fill="#1a73e8" />
                <circle cx="100" cy="100" r="3" fill="#1a73e8" />
                <circle cx="200" cy="80" r="3" fill="#1a73e8" />
                <circle cx="300" cy="120" r="3" fill="#1a73e8" />
              </svg>
              <div className="chart-legend">
                <span>Suzuki Cultus</span>
                <span>Toyota Corolla</span>
                <span>Toyota Corolla XLI/GLI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Charts Row */}
        <div className="chart-row">
          <div className="chart-card">
            <h3>Damage Parts Over Time</h3>
            <div className="chart-placeholder line-chart">
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                <polyline points="20,100 100,80 200,60 300,70" fill="none" stroke="#1a73e8" strokeWidth="2" />
                <polyline points="20,130 100,110 200,100 300,110" fill="none" stroke="#f97316" strokeWidth="2" />
                <circle cx="20" cy="100" r="3" fill="#1a73e8" />
                <circle cx="100" cy="80" r="3" fill="#1a73e8" />
                <circle cx="200" cy="60" r="3" fill="#1a73e8" />
                <circle cx="300" cy="70" r="3" fill="#1a73e8" />
              </svg>
            </div>
          </div>

          <div className="chart-card">
            <h3>Damage Severity Distribution</h3>
            <div className="chart-placeholder pie-chart">
              <div className="pie-chart-container">
                <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#f97316" strokeWidth="30" strokeDasharray="188 502" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#a8d5ba" strokeWidth="30" strokeDasharray="94 502" strokeDashoffset="-188" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#fda29b" strokeWidth="30" strokeDasharray="220 502" strokeDashoffset="-282" />
                </svg>
                <div className="pie-legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#f97316' }}></span>
                    <span>Minor - 10 claims (7%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;