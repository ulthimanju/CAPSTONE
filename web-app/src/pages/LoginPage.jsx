import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Typography } from '../components/ui/Typography';

export const LoginPage = () => {
  const { loginWithGoogle } = useAuth();

  return (
    <Card style={{ textAlign: 'center', padding: '2rem' }}>
      <Typography variant="h4" style={{ marginBottom: '1rem' }}>Welcome Back</Typography>
      <Typography variant="body1" color="secondary" style={{ marginBottom: '2rem' }}>
        Sign in with your Google account to access your workspaces.
      </Typography>
      <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={loginWithGoogle}>
        Sign in with Google
      </Button>
    </Card>
  );
};
