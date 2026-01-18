import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { doc, setDoc } from "firebase/firestore"; 
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (firstName && lastName && email && password && confirmPassword) {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      try {
        // Create user with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Store additional user data in Firestore
      await setDoc(doc(db, "users", user.uid), {
  uid: user.uid,
  firstName,
  lastName,
  email,
  createdAt: new Date()
});


        alert("Signup successful! Please login to access your dashboard.");
        navigate("/user-login");
      } catch (err) {
        setError("Error signing up: " + err.message);
      }
    } else {
      setError("Please fill in all fields");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f7f7f7"
    }}>
      <form onSubmit={handleSignup} style={{
        background: "#fff",
        padding: "32px 32px 24px 32px",
        borderRadius: 16,
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        width: 340,
        maxWidth: "90%"
      }}>
        <h2 style={{ textAlign: "center", marginBottom: 24 }}>Sign Up</h2>
        {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>First Name</label>
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #e0e0e0"
            }}
          />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Last Name</label>
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #e0e0e0"
            }}
          />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Email</label>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #e0e0e0"
            }}
          />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Password</label>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #e0e0e0"
            }}
          />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Confirm Password</label>
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #e0e0e0"
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            width: "100%",
            background: "#ff8a00",
            color: "#fff",
            fontWeight: 700,
            border: "none",
            borderRadius: 6,
            padding: "12px 0",
            fontSize: "1.1rem",
            cursor: "pointer",
            marginBottom: 12
          }}
        >
          Signup
        </button>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: "0.97rem" }}>
          Already have an account? <a href="#" onClick={() => navigate("/user-login")} style={{ color: "#ff8a00", textDecoration: "none" }}>Login</a>
        </div>
      </form>
    </div>
  );
}
