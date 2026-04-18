import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css";

export default function InsuranceCompanyLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  // ─── LOGIN ───────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginForm.email.trim().toLowerCase(),
          password: loginForm.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      localStorage.setItem("staff_token", data.access_token);
      localStorage.setItem("staff_role", data.staff.role);
      localStorage.setItem("staff_name", data.staff.name);
      localStorage.setItem("staff_id", data.staff.id);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_role", data.staff.role);
      navigate("/admin-dashboard", { replace: true });
    } catch {
      setError("Cannot connect to server. Make sure backend is running.");
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: "100%", padding: "14px 18px", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(15,23,42,0.6)", fontSize: "15px",
    color: "#fff", outline: "none", transition: "all 0.3s ease",
    boxSizing: "border-box",
  };
  const labelStyle = {
    fontWeight: 500, marginBottom: 7, display: "block",
    color: "#e2e8f0", fontSize: "13px", letterSpacing: "0.02em",
  };
  const focusIn = e => { e.target.style.borderColor = '#f97322'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; };
  const focusOut = e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; };

  return (
    <div style={{
      display: "flex", width: "100vw", height: "100vh",
      margin: 0, padding: 0, overflow: "hidden",
      fontFamily: "'Inter', sans-serif"
    }}>

      {/* ── LEFT BRANDING PANEL ──────────────────────────── */}
      <div style={{
        flex: 1, background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden", height: "100vh"
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(circle at 20% 20%, rgba(249,115,22,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(234,88,12,0.10) 0%, transparent 50%)",
          zIndex: 1
        }} />
        <div className="orb" style={{ top: '8%', left: '10%', width: '280px', height: '280px', background: 'rgba(249,115,22,0.10)', animation: 'orbFloat 20s infinite linear' }} />
        <div className="orb" style={{ bottom: '10%', right: '8%', width: '220px', height: '220px', background: 'rgba(234,88,12,0.07)', animation: 'glowPulse 15s infinite ease-in-out' }} />

        <div className="float-rich" style={{ textAlign: "center", zIndex: 3, position: "relative", padding: "0 40px" }}>
          <div className="glass-premium" style={{
            borderRadius: "40px", padding: "55px 50px",
            border: "1px solid rgba(255,255,255,0.1)", position: "relative", overflow: "hidden"
          }}>
            <div style={{
              position: "absolute", top: "-40px", right: "-40px", width: "120px", height: "120px",
              background: "rgba(249,115,22,0.15)", filter: "blur(35px)", borderRadius: "50%"
            }} />

            <div style={{ fontSize: "64px", marginBottom: "20px", filter: "drop-shadow(0 8px 16px rgba(249,115,22,0.3))" }}>🏢</div>

            <h1 style={{
              color: "#fff", fontWeight: 900, fontSize: "3rem",
              marginBottom: 6, letterSpacing: "-0.04em", textShadow: "0 10px 30px rgba(0,0,0,0.5)"
            }}>Insurance Company</h1>
            <h2 style={{ color: "#f97316", fontWeight: 700, fontSize: "1.4rem", marginBottom: 10, letterSpacing: "-0.02em" }}>
              Staff Portal
            </h2>

            <div style={{ height: "4px", width: "80px", background: "linear-gradient(90deg, #f97312, #ea580c)", margin: "0 auto 35px", borderRadius: "2px" }} />

            {/* Illustration */}
            <svg width="300" height="175" viewBox="0 0 300 175" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: "28px" }}>
              <rect x="80" y="35" width="140" height="120" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
              {[0,1,2].map(col => [0,1,2,3].map(row => (
                <rect key={`w${col}${row}`} x={100+col*35} y={50+row*25} width="20" height="16" rx="3"
                  fill={`rgba(249,115,22,${0.10+row*0.05})`} stroke="rgba(249,115,22,0.3)" strokeWidth="0.8"/>
              )))}
              <rect x="130" y="125" width="40" height="30" rx="4" fill="rgba(249,115,22,0.2)" stroke="rgba(249,115,22,0.4)" strokeWidth="1"/>
              <circle cx="150" cy="22" r="14" fill="rgba(249,115,22,0.9)" />
              <text x="150" y="27" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">IC</text>
            </svg>

            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>
              Staff Management Center
            </p>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.88rem", margin: "10px auto 0", maxWidth: "270px", lineHeight: 1.6 }}>
              Manage claims, policies and AI reports. Access level is determined by your assigned role.
            </p>

            {/* Role info */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "26px", flexWrap: "wrap" }}>
              <div style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", color: "#fb923c", fontWeight: 600 }}>
                👑 Manager — Full Access
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
                👁️ Employee — View Only
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ─────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0f172a", height: "100vh", position: "relative", overflowY: "auto"
      }}>
        <div style={{
          position: "absolute", top: 0, right: 0, width: "400px", height: "400px",
          background: "radial-gradient(circle, rgba(249,115,22,0.05) 0%, transparent 70%)", zIndex: 0
        }} />

        <div style={{
          width: 460, maxWidth: "92%",
          background: "rgba(30,41,59,0.8)", backdropFilter: "blur(20px)",
          borderRadius: 32, border: "1px solid rgba(255,255,255,0.1)",
          padding: "44px 42px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          zIndex: 1, margin: "24px 0"
        }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              background: "linear-gradient(135deg, #f97322, #ea580c)",
              width: "68px", height: "68px", borderRadius: "20px",
              margin: "0 auto 18px", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "28px",
              boxShadow: "0 10px 20px rgba(249,115,22,0.3)", transform: "rotate(-5deg)"
            }}>🏢</div>
            <h2 style={{ fontWeight: 800, color: "#fff", fontSize: "1.9rem", letterSpacing: "-0.03em", margin: 0 }}>
              Company Portal
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "13px", marginTop: 6, fontWeight: 400 }}>
              Insurance Company Staff Access System
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              color: "#f87171", background: "rgba(248,113,113,0.1)",
              padding: "11px 14px", borderRadius: "10px", marginBottom: 18,
              fontSize: "13px", border: "1px solid rgba(248,113,113,0.2)", textAlign: "center"
            }}>{error}</div>
          )}

          {/* ── LOGIN FORM ── */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Work Email</label>
              <input type="email" placeholder="yourname@company.com"
                value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                required style={inputStyle} onFocus={focusIn} onBlur={focusOut}
              />
            </div>
            <div style={{ marginBottom: 26 }}>
              <label style={labelStyle}>Password</label>
              <input type="password" placeholder="••••••••••"
                value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                required style={inputStyle} onFocus={focusIn} onBlur={focusOut}
              />
            </div>
            <button type="submit" disabled={loading} style={{
              width: "100%", background: loading ? "#475569" : "linear-gradient(135deg, #f97322 0%, #ea580c 100%)",
              color: "#fff", fontWeight: 700, border: "none", borderRadius: 14,
              padding: "16px 0", fontSize: "16px", cursor: loading ? "not-allowed" : "pointer",
              marginBottom: 20, transition: "all 0.3s ease",
              boxShadow: loading ? "none" : "0 10px 25px rgba(249,115,22,0.3)",
            }}>
              {loading ? "Logging in..." : "🔐 Access Portal"}
            </button>
          </form>

          {/* Back link */}
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button type="button" onClick={() => navigate("/login-selection")}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "13px", transition: "color 0.3s" }}
              onMouseOver={e => e.target.style.color = "#f97322"}
              onMouseOut={e => e.target.style.color = "#94a3b8"}
            >
              ← Return to Login Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

