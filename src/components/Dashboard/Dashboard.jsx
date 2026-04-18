import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import Overview from './Overview';
import AIReport from './AIReport';
import History from './History';
import ClaimsList from './ClaimsList';
import NewClaimForm from './NewClaimForm';
import './Dashboard.css';

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [showNewClaim, setShowNewClaim] = useState(false);
  const [showAIReportModal, setShowAIReportModal] = useState(false);
  const [isAIReportViewOnly, setIsAIReportViewOnly] = useState(false);
  const [refreshClaims, setRefreshClaims] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClaim, setSelectedClaim] = useState(null);



  const navigate = useNavigate();
  const { user } = useUser();

  // Get user initials for avatar
  const userInitials = useMemo(() => {
    if (!user) return "CM";
    const firstName = user.first_name || user.firstName || "";
    const lastName = user.last_name || user.lastName || "";
    const initials = ((firstName[0] || "") + (lastName[0] || "")).toUpperCase();
    return initials || "CM";
  }, [user]);

  // Get user name
  const userName = useMemo(() => {
    if (!user) return "Claims Manager";
    const firstName = user.first_name || user.firstName || "";
    const lastName = user.last_name || user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || "Claims Manager";
  }, [user]);

  const handleNewClaimSuccess = (claim) => {
    setSelectedClaim(claim);
    setRefreshClaims((prev) => prev + 1);
    setShowNewClaim(false);
    setIsAIReportViewOnly(false); // Let them generate it
    setShowAIReportModal(true); // Open AI Report in Modal, not standard section switch
  };

  const handleOpenClaimReport = (claim) => {
    setSelectedClaim(claim);
    setIsAIReportViewOnly(true); // Viewer only, don't ask to generate
    setShowAIReportModal(true); // Open AI Report in Modal overlay
  };


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
            <ClaimsList refresh={refreshClaims} searchTerm={searchTerm} onOpenAIReport={handleOpenClaimReport} />
          </div>
        );
      case 'aiReport':
        return (
          <AIReport
            selectedClaim={selectedClaim}
            onNavigateToHistory={() => setActiveSection('history')}
          />
        );
      case 'history':
        return <History />;
      default:
        return null;
    }
  };

  const handleMenuClick = (section) => {
    if (section === 'claims') {
      setSelectedClaim(null);
    }
    setActiveSection(section);
  };

  useEffect(() => {
    // Auth Guard: If no token, kick back to login selection
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login-selection', { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    // Use replace: true so back button doesn't return to private dashboard
    navigate('/login-selection', { replace: true });
  };

  // Header always visible; search only for claims section
  const showHeaderSection = true;
  const showSearchSection = activeSection === 'claims';

  // Modal styles
  const modalOverlayStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backdropFilter: 'blur(4px)'
  };

  const modalContentStyle = {
    background: '#f8f9fa',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '1200px',
    height: '90vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
  };

  const closeBtnStyle = {
    position: 'absolute',
    top: '12px',
    right: '20px',
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#666',
    zIndex: 10
  };

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
            <span>AI Report Dashboard</span>
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
        {/* Header - Always shown */}
        <header className="header">
          <div className="header-left">
            <h1>Welcome back, {userName}!</h1>
            <p>Have a great day managing claims</p>
          </div>
          <div className="header-right">
            <div className="user-avatar">{userInitials}</div>
          </div>
        </header>

        {/* Search Bar - Only show for Claims section */}
        {showSearchSection && (
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

      {/* New Claim Modal */}
      {showNewClaim && (
        <NewClaimForm
          onClose={() => setShowNewClaim(false)}
          onSuccess={(claim) => handleNewClaimSuccess(claim)}
        />
      )}

      {/* AI Report Modal Popup */}
      {showAIReportModal && (
        <div className="ai-report-modal-overlay" style={modalOverlayStyle} onClick={() => setShowAIReportModal(false)}>
          <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
            <button style={closeBtnStyle} onClick={() => setShowAIReportModal(false)}>&times;</button>
            <div style={{ padding: '20px' }}>
              <AIReport
                selectedClaim={selectedClaim}
                viewOnly={isAIReportViewOnly}
                onNavigateToHistory={() => {
                  setShowAIReportModal(false);
                  setActiveSection('history');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
