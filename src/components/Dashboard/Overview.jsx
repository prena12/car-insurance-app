import React, { useMemo, useEffect, useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import './Overview.css';

const Overview = () => {
  const { user } = useUser();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch Notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem('access_token');
      const email = user?.email;
      
      if (!token && !email) return;

      try {
        let url = 'http://localhost:5000/api/notifications';
        let options = { headers: {} };

        if (token) {
          options.headers['Authorization'] = `Bearer ${token}`;
        } else if (email) {
          url = `http://localhost:5000/api/notifications/user?email=${encodeURIComponent(email)}`;
        }

        const res = await fetch(url, options);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000); // Polling every 5s for live feel
    return () => clearInterval(interval);
  }, [user]);

  const markNotificationAsRead = async (id) => {
    const token = localStorage.getItem('access_token');
    const email = user?.email;
    
    if (!token && !email) return;

    try {
      let url = `http://localhost:5000/api/notifications/${id}/read`;
      let options = { 
        method: 'PUT',
        headers: {} 
      };

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      } else if (email) {
        url = `http://localhost:5000/api/notifications/user/${id}/read?email=${encodeURIComponent(email)}`;
      }

      await fetch(url, options);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

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

  // Fetch claims from backend - only user's claims
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const email = user?.email;
        console.log("🔐 Auth Check -> Token:", !!token, "Email:", email);
        
        if (!token && !email) {
          console.warn("❌ No token or email found, falling back to local storage only.");
          setClaims(loadLocalClaims());
          setLoading(false);
          return;
        }

        let url = 'http://localhost:5000/api/admin/claims';
        let options = { headers: {} };

        if (token) {
          options.headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, options);

        console.log("📡 API Response Status:", response.status);

        let data = [];
        if (response.ok) {
          const claimsData = await response.json();
          data = Array.isArray(claimsData) ? claimsData : [];
          console.log("✅ Claims fetched from database:", data);
        } else {
          const errorData = await response.json();
          console.error("❌ API Error:", response.status, errorData);
        }

        const localClaims = loadLocalClaims();
        const mergedMap = new Map();
        
        localClaims.forEach(c => {
          const id = c.claim_number || c.claimNumber;
          if (id) mergedMap.set(id, c);
        });

        data.forEach(c => {
          const id = c.claim_number || c.claimNumber;
          if (id) mergedMap.set(id, c);
        });

        const finalClaims = Array.from(mergedMap.values());
        
        // Sort by date descending
        finalClaims.sort((a, b) => {
          const dateA = a.created_at || a.date_time || a.date;
          const dateB = b.created_at || b.date_time || b.date;
          return new Date(dateB) - new Date(dateA);
        });

        setClaims(finalClaims);

      } catch (error) {
        console.error("❌ Network Error:", error);
        setClaims(loadLocalClaims());
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchClaims();
    }
    
    // Refresh claims periodically
    const interval = setInterval(() => { if (user) fetchClaims(); }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Get user initials for avatar
  const userInitials = useMemo(() => {
    if (!user) return "CM";
    const firstName = user.first_name || user.firstName || "";
    const lastName = user.last_name || user.lastName || "";
    return ((firstName[0] || "") + (lastName[0] || "")).toUpperCase() || "CM";
  }, [user]);

  const userName = user ? `${user.first_name || user.firstName || ""} ${user.last_name || user.lastName || ""}`.trim() : "Claims Manager";
  const userEmail = user?.email || "user@example.com";

  // Calculate statistics from user's claims only
  const stats = useMemo(() => {
    if (!claims || claims.length === 0) {
      return {
        totalClaims: 0,
        topDamagedPart: 'N/A',
        topSeverity: 'N/A',
        totalCost: 0,
        topVehicleModels: [],
        statusData: [],
        severityData: [],
        timelineData: []
      };
    }

    const totalClaims = claims.length;

    // Top damaged part
    const damagedParts = {};
    claims.forEach(claim => {
      if (claim.missing_parts) {
        damagedParts[claim.missing_parts] = (damagedParts[claim.missing_parts] || 0) + 1;
      }
    });
    const topDamagedPart = Object.keys(damagedParts).length > 0 
      ? Object.keys(damagedParts).reduce((a, b) => damagedParts[a] > damagedParts[b] ? a : b)
      : 'N/A';

    // Top severity & Distribution
    const severityMap = { Minor: 0, Moderate: 0, Severe: 0 };
    claims.forEach(claim => {
       const amount = claim.claim_amount || 0;
       if (amount > 100000) severityMap.Severe++;
       else if (amount > 25000) severityMap.Moderate++;
       else severityMap.Minor++;
    });
    const topSeverity = Object.keys(severityMap).reduce((a, b) => severityMap[a] > severityMap[b] ? a : b);
    
    const severityData = [
      { name: 'Minor', value: severityMap.Minor, color: '#3b82f6' },
      { name: 'Moderate', value: severityMap.Moderate, color: '#f59e0b' },
      { name: 'Severe', value: severityMap.Severe, color: '#ef4444' }
    ].filter(s => s.value > 0);

    // Timeline Data (Group by Date)
    const timelineMap = {};
    claims.forEach(claim => {
      const dateStr = claim.created_at || claim.date_time;
      if (!dateStr) return;
      
      const date = new Date(dateStr);
      // Format as Month Day (e.g., "Apr 09")
      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!timelineMap[formattedDate]) {
        timelineMap[formattedDate] = { date: formattedDate, claims: 0, cost: 0 };
      }
      timelineMap[formattedDate].claims += 1;
      timelineMap[formattedDate].cost += (claim.claim_amount || 0);
    });
    
    // Sort by date chronologically
    const timelineData = Object.values(timelineMap).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Claim Status Distribution
    const statusCountsRaw = { Pending: 0, Approved: 0, Rejected: 0 };
    claims.forEach(claim => {
      if (claim.status && statusCountsRaw.hasOwnProperty(claim.status)) {
        statusCountsRaw[claim.status]++;
      }
    });
    
    const statusPieData = [
      { name: 'Pending', value: statusCountsRaw.Pending, color: '#f59e0b' },
      { name: 'Approved', value: statusCountsRaw.Approved, color: '#10b981' },
      { name: 'Rejected', value: statusCountsRaw.Rejected, color: '#ef4444' }
    ].filter(s => s.value > 0);

    // Total cost
    const totalCost = claims.reduce((sum, claim) => sum + (claim.claim_amount || 0), 0);

    // Top vehicle models
    const vehicleModels = {};
    claims.forEach(claim => {
      if (claim.vehicle_type || claim.vehicle_make) {
        const model = claim.vehicle_type || claim.vehicle_make;
        vehicleModels[model] = (vehicleModels[model] || 0) + 1;
      }
    });
    const topVehicleModels = Object.entries(vehicleModels)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([model, count]) => ({ model, count }));

    return {
      totalClaims,
      topDamagedPart,
      topSeverity,
      totalCost,
      topVehicleModels,
      statusData: statusPieData,
      severityData,
      timelineData
    };
  }, [claims]);

  // Colors for charts
  const barColors = ['#f97316', '#fbb780', '#fddec5', '#e2e8f0', '#cbd5e1'];

  return (
    <div className="overview-container">
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
        
        {/* Notifications placed horizontally at the far right of the card */}
        <div className="overview-notifications" style={{ marginLeft: 'auto', position: 'relative' }}>
          <button
            className="notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ 
              position: 'relative', 
              background: 'rgba(255, 255, 255, 0.2)', 
              border: '1px solid rgba(255, 255, 255, 0.4)',
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              transition: 'background 0.3s'
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                background: '#e74c3c',
                color: 'white',
                borderRadius: '50%',
                minWidth: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '2px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '120%',
              right: '0',
              width: '340px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
              zIndex: 1000,
              maxHeight: '420px',
              overflowY: 'auto',
              border: '1px solid #eaeaea',
              color: '#333'
            }}>
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid #eee',
                background: '#fcfcfc',
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h4 style={{ margin: 0, color: '#333', fontSize: '15px', fontWeight: 700 }}>Notifications</h4>
                {unreadCount > 0 && (
                  <span style={{ background: '#e74c3c', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                    {unreadCount} new
                  </span>
                )}
              </div>
              {notifications.length === 0 ? (
                <p style={{ padding: '32px 16px', color: '#999', textAlign: 'center', margin: 0, fontSize: '14px' }}>No notifications yet</p>
              ) : (
                notifications.map(n => {
                  const type = (n.notification_type || '').toLowerCase();
                  const isPending = type === 'pending';
                  const isApproved = type === 'approved';
                  const isRejected = type === 'rejected';
                  const isLogin = type === 'login' || type === 'signup';

                  const borderColor = isApproved ? '#34a853' : isRejected ? '#ea4335' : isLogin ? '#4facfe' : isPending ? '#f59e0b' : '#333';
                  const bgColor = n.is_read
                    ? 'white'
                    : isApproved ? '#f0faf3' : isRejected ? '#fff5f5' : isLogin ? '#eef7ff' : isPending ? '#fff9eb' : '#f9f9f9';
                  
                  return (
                    <div
                      key={n.id}
                      onClick={() => markNotificationAsRead(n.id)}
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid #f5f5f5',
                        background: bgColor,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        borderLeft: `5px solid ${n.is_read ? '#eee' : borderColor}`,
                        textAlign: 'left',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fcfcfc' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = bgColor }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <span style={{ 
                          fontSize: '20px', 
                          flexShrink: 0, 
                          background: n.is_read ? '#f0f0f0' : `${borderColor}20`,
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: borderColor
                        }}>
                          {isApproved ? '✅' : isRejected ? '❌' : isLogin ? '👋' : '⏳'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: 700, 
                              textTransform: 'uppercase', 
                              color: borderColor,
                              opacity: n.is_read ? 0.6 : 1
                            }}>
                              {type || 'General'}
                            </span>
                            {!n.is_read && <span style={{ width: '8px', height: '8px', background: '#e74c3c', borderRadius: '50%' }}></span>}
                          </div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#333', lineHeight: '1.4', fontWeight: n.is_read ? 400 : 600 }}>{n.message}</p>
                          <small style={{ color: '#999', fontSize: '11px', fontWeight: 500 }}>
                             🕒 {new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </small>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <h3>Total Claims Submitted</h3>
          </div>
          <div className="stat-value">{loading ? '...' : stats.totalClaims}</div>
          <div className="stat-label">All Time</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>Top Damaged Part</h3>
          </div>
          <div className="stat-value" style={{ textTransform: 'capitalize' }}>
            {loading ? '...' : (stats.topDamagedPart.replace(/_/g, ' ') || 'N/A')}
          </div>
          <div className="stat-label">Most frequent</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>Top Severity</h3>
          </div>
          <div className="stat-value" style={{ textTransform: 'capitalize' }}>
            {loading ? '...' : stats.topSeverity}
          </div>
          <div className="stat-label">Based on Estimated Costs</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>Estimated Repair Cost</h3>
          </div>
          <div className="stat-value">Rs {loading ? '...' : stats.totalCost.toLocaleString()}</div>
          <div className="stat-label">Total Amount</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Chart 1: Claim Models Bar Chart */}
        <div className="chart-card small">
          <h3>Top 5 Most Claimed Models</h3>
          {loading || stats.topVehicleModels.length === 0 ? (
            <div className="chart-empty-state">
              {loading ? 'Loading...' : 'No claims data to display'}
            </div>
          ) : (
            <div style={{ height: 220, width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topVehicleModels} margin={{ top: 5, right: 30, left: -20, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="model" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                  <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.topVehicleModels.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Status Pie Chart */}
        <div className="chart-card small">
          <h3>Claim Status Distribution</h3>
          {loading || stats.statusData.length === 0 ? (
            <div className="chart-empty-state">
              {loading ? 'Loading...' : 'No claims data to display'}
            </div>
          ) : (
            <div style={{ height: 220, width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                  >
                    {stats.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 3: Timeline Area Chart */}
        <div className="chart-card large">
          <h3>Claims Timeline (Volume)</h3>
          {loading || stats.timelineData.length === 0 ? (
             <div className="chart-empty-state">
               {loading ? 'Loading...' : 'No claims data to display'}
             </div>
          ) : (
            <div style={{ height: 280, width: '100%', marginTop: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorClaims" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="claims" name="Total Claims" stroke="#ea580c" strokeWidth={3} fillOpacity={1} fill="url(#colorClaims)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 4: Severity Pie Chart */}
        <div className="chart-card large">
          <h3>Damage Severity Distribution</h3>
          {loading || stats.severityData.length === 0 ? (
            <div className="chart-empty-state">
              {loading ? 'Loading...' : 'No claims data to display'}
            </div>
          ) : (
            <div style={{ height: 280, width: '100%', marginTop: '20px', display: 'flex' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.severityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={0}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    {stats.severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;
