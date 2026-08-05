import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/identity/auth';
import { profileService } from '../services/identity/profile';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/ui/Spinner';
import { Typography } from '../components/ui/Typography';

export const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Exchange session / fetch profile via HTTP-only cookie set by identity service
        const user = await profileService.getProfile();
        setUser(user);
        navigate('/profile');
      } catch (err) {
        navigate('/login');
      }
    };
    handleCallback();
  }, [navigate, setUser]);

  return (
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <Spinner size="lg" />
      <Typography variant="body1" style={{ marginTop: '1rem' }}>
        Authenticating, please wait...
      </Typography>
    </div>
  );
};
