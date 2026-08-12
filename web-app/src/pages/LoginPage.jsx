import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Typography } from '../components/ui/Typography';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
  </svg>
);

export const LoginPage = () => {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get('reason') === 'session_expired';

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google Sign-in error:', err);
      setLoading(false);
    }
  };

  return (
    <Card style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
      <Typography variant="h2" weight="bold" style={{ marginBottom: '0.5rem' }}>
        Welcome Back
      </Typography>
      
      {isExpired ? (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          color: '#f87171',
          fontSize: '0.875rem'
        }}>
          Your session has expired. Please sign in again to continue.
        </div>
      ) : (
        <Typography variant="body" color="muted" style={{ marginBottom: '2rem' }}>
          Sign in with your Google account to access your workspaces.
        </Typography>
      )}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
        onClick={handleSignIn}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
      >
        {!loading && <GoogleIcon />}
        <span>Sign in with Google</span>
      </Button>
    </Card>
  );
};
