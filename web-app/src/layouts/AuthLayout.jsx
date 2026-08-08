import React from 'react';

export const AuthLayout = ({ children }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg, var(--bg))',
        color: 'var(--color-text-primary, var(--text))',
        padding: '1.5rem',
        transition: 'background-color var(--transition-normal) ease, color var(--transition-normal) ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          margin: '0 auto',
        }}
      >
        {children}
      </div>
    </div>
  );
};
