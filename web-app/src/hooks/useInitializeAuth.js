import { useEffect } from 'react';
import axios from 'axios';
import { profileService } from '../services/identity/profile';
import { useAuthStore } from '../store/authStore';

export const useInitializeAuth = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    const controller = new AbortController();

    const initAuth = async () => {
      try {
        const user = await profileService.getProfile({ signal: controller.signal });
        setUser(user);
      } catch (error) {
        if (axios.isCancel(error) || error.name === 'CanceledError') {
          return; // Ignore canceled request errors on component unmount
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          clearAuth();
        } else {
          useAuthStore.setState({ isLoading: false });
        }
      }
    };

    initAuth();

    return () => {
      controller.abort();
    };
  }, [setUser, clearAuth]);
};
