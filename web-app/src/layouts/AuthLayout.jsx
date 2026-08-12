import React from 'react';

export const AuthLayout = ({ children }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-surface)',
        color: 'var(--color-text-primary)',
        padding: 'var(--space-6)',
        transition: 'background-color var(--motion-normal) ease, color var(--motion-normal) ease',
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
