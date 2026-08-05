import React from 'react';

export const AuthLayout = ({ children }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0b' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '2rem', backgroundColor: '#16161a', border: '1px solid #1f1f22', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        {children}
      </div>
    </div>
  );
};

