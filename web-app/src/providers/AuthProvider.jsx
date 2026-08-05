import React, { useEffect } from 'react';
import { profileService } from '../services/identity/profile';
import { useAuthStore } from '../store/authStore';

export const AuthProvider = ({ children }) => {
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await profileService.getProfile();
        setUser(user);
      } catch (error) {
        clearAuth();
      }
    };
    initAuth();
  }, [setUser, clearAuth]);

  return <>{children}</>;
};
