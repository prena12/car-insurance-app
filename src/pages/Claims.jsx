import React, { useState } from 'react';
import NewClaimForm from '../components/Dashboard/NewClaimForm';
import ClaimsList from '../components/Dashboard/ClaimsList';

export default function Claims() {
  const [refreshClaims, setRefreshClaims] = useState(0);

  return (
    <div className="container section">
      <h1 className="section-title">Claims</h1>
      <p className="muted">Submit your claim below. Your claim will be saved to the database and will appear in claims management.</p>
      <div className="claim-page-grid">
        <div className="claim-form-card">
          <NewClaimForm onClose={() => {}} onSuccess={() => setRefreshClaims((prev) => prev + 1)} />
        </div>
        <div className="claim-list-card">
          <h2>Your Claims</h2>
          <ClaimsList refresh={refreshClaims} />
        </div>
      </div>
    </div>
  );
}



