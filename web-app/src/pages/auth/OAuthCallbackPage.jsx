import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SessionManager } from '../../services/identity/sessionManager';
import { Spinner } from '../../components/ui/Spinner';
import { Typography } from '../../components/ui/Typography';

export const OAuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    const handleOAuthCallback = async () => {
      try {
        // Exchange HTTP-only refresh cookie for session validation & user profile
        await SessionManager.initialize({ signal: controller.signal });
        navigate('/profile', { replace: true });
      } catch (err) {
        if (axios.isCancel(err) || err.name === 'CanceledError') {
          return;
        }
        navigate('/login', { replace: true });
      }
    };

    handleOAuthCallback();

    return () => {
      controller.abort();
    };
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
      <Spinner size="lg" />
      <Typography variant="body1" style={{ marginTop: '1rem' }}>
        Completing OAuth login, please wait...
      </Typography>
    </div>
  );
};
