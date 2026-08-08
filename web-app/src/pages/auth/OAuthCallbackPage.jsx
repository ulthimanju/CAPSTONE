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
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
          SessionManager.setAccessToken(token);
        }

        // Initialize session / fetch profile
        await SessionManager.initialize({ signal: controller.signal });
        navigate('/workspaces', { replace: true });

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg, var(--bg))',
        color: 'var(--color-text-primary, var(--text))',
        transition: 'background-color var(--transition-normal) ease',
      }}
    >
      <Spinner size="lg" />
      <Typography variant="body" color="muted" style={{ marginTop: '1rem' }}>
        Completing OAuth login, please wait...
      </Typography>
    </div>
  );
};
