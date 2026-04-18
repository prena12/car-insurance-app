import React from 'react';
import './AdminSidebar.css';

const AdminSidebar = ({ activeSection, setActiveSection, onLogout, isManager }) => {
  return (
    <aside className="admin-sidebar">
      <div className="admin-logo">
        <span className="logo-text">IntelliClaims <span className="logo-highlight">Portal</span></span>
      </div>

      <nav className="sidebar-menu">
        <div
          className={`menu-item ${activeSection === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          <span className="menu-icon">📊</span>
          <span>Overview</span>
        </div>
        <div
          className={`menu-item ${activeSection === 'claims' ? 'active' : ''}`}
          onClick={() => setActiveSection('claims')}
        >
          <span className="menu-icon">📋</span>
          <span>Claims Management</span>
        </div>
        <div
          className={`menu-item ${activeSection === 'policies' ? 'active' : ''}`}
          onClick={() => setActiveSection('policies')}
        >
          <span className="menu-icon">👥</span>
          <span>Insured Users</span>
        </div>
        <div
          className={`menu-item ${activeSection === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveSection('reports')}
        >
          <span className="menu-icon">📄</span>
          <span>Claim Reports</span>
        </div>


      </nav>

      <div className="sidebar-footer">
        <div className="menu-item logout" onClick={onLogout}>
          <span className="menu-icon">🚪</span>
          <span>Logout</span>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
