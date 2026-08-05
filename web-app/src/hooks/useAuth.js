import { useAuthStore } from '../store/authStore';
import { authService } from '../services/identity/auth';
import { SessionManager } from '../services/identity/sessionManager';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, isInitialized, setUser, clearAuth } = useAuthStore();

  const loginWithGoogle = () => {
    window.location.href = authService.getGoogleLoginUrl();
  };

  const logout = async () => {
    await SessionManager.logout();
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    setUser,
    loginWithGoogle,
    logout,
  };
};
