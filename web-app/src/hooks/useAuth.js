import { useAuthStore } from '../store/authStore';
import { authService } from '../services/identity/auth';
import { sessionService } from '../services/identity/session';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, setUser, clearAuth } = useAuthStore();

  const loginWithGoogle = () => {
    window.location.href = authService.getGoogleLoginUrl();
  };

  const logout = async () => {
    try {
      await sessionService.logout();
    } finally {
      clearAuth();
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    loginWithGoogle,
    logout,
  };
};
