import { useEffect } from 'react';
import { profileService } from '../services/identity/profile';
import { useAuthStore } from '../store/authStore';

export const useInitializeAuth = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await profileService.getProfile();
        setUser(user);
      } catch (error) {
        // Only clear auth and logout on 401/403 unauthenticated errors.
        // Server (5xx) or network errors preserve offline/retry state without logging out.
        if (error.response?.status === 401 || error.response?.status === 403) {
          clearAuth();
        } else {
          useAuthStore.setState({ isLoading: false });
        }
      }
    };
    initAuth();
  }, [setUser, clearAuth]);
};
