import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Overview from './Overview'; 
import AIReport from './AIReport';
import History from './History';
import NewClaimForm from './NewClaimForm';
import './Dashboard.css';

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('overview'); // <-- CHANGE FROM 'claims' TO 'overview'
  const [showNewClaim, setShowNewClaim] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview />;
      case 'claims':
        return (
          <div className="claims-management">
            <div className="claims-header">
              <h2>Claims Management</h2>
              <div className="claims-actions">
                <button className="new-claim-btn" onClick={() => setShowNewClaim(true)}>
                  + New Claim
                </button>
              </div>
            </div>

            {/* Claims Table */}
            <div className="claims-table">
              <div className="table-header">
                <div className="col">Claim Number</div>
                <div className="col">Customer Name</div>
                <div className="col">Date</div>
                <div className="col">Amount</div>
                <div className="col">Status</div>
                <div className="col">Actions</div>
                <div className="col">AI Report</div>
              </div>

              <div className="table-body">
                <div className="no-claims-message">
                  <div className="empty-icon">📄</div>
                  <p>No claims found</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'aiReport':
        return <AIReport />;
      case 'history':
        return <History />;
      default:
        return null;
    }
  };

  const handleMenuClick = (section) => {
    setActiveSection(section);
  };

  const handleLogout = () => {
    navigate('/login-selection');
  };

  // Show header and search only for claims section
  const showHeaderSection = activeSection === 'claims';

  return (
    <div className="user-dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-text">TPL <span className="logo-highlight">Claims</span></span>
        </div>

        <nav className="sidebar-menu">
          <div 
            className={`menu-item ${activeSection === 'overview' ? 'active-highlight' : ''}`}
            onClick={() => handleMenuClick('overview')}
          >
            <span className="menu-icon">📊</span>
            <span>Overview</span>
          </div>
          <div 
            className={`menu-item ${activeSection === 'claims' ? 'active-highlight' : ''}`}
            onClick={() => handleMenuClick('claims')}
          >
            <span className="menu-icon">📋</span>
            <span>Claims</span>
          </div>
          <div 
            className={`menu-item ${activeSection === 'aiReport' ? 'active-highlight' : ''}`}
            onClick={() => handleMenuClick('aiReport')}
          >
            <span className="menu-icon">🤖</span>
            <span>AI Report</span>
          </div>
          <div 
            className={`menu-item ${activeSection === 'history' ? 'active-highlight' : ''}`}
            onClick={() => handleMenuClick('history')}
          >
            <span className="menu-icon">📜</span>
            <span>History</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="menu-item logout" onClick={handleLogout}>
            <span className="menu-icon">🚪</span>
            <span>Logout</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header - Only show for Claims section */}
        {showHeaderSection && (
          <header className="header">
            <div className="header-left">
              <h1>Welcome back, Claims Manager!</h1>
              <p>Have a great day managing claims</p>
            </div>
            <div className="header-right">
              <button className="notification-btn">🔔</button>
              <div className="user-avatar">CM</div>
            </div>
          </header>
        )}

        {/* Search Bar - Only show for Claims section */}
        {showHeaderSection && (
          <div className="search-section">
            <input 
              type="text" 
              placeholder="Search by claim number or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        )}

        {renderContent()}
      </main>

      {showNewClaim && (
        <NewClaimForm onClose={() => setShowNewClaim(false)} />
      )}
    </div>
  );
};

export default Dashboard;
