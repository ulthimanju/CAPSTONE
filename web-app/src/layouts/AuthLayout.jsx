import React from 'react';

export const AuthLayout = ({ children }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f5f7' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '2rem', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        {children}
      </div>
    </div>
  );
};
