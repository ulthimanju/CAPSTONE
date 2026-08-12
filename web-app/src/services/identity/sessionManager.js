import { authService } from './auth';
import { profileService } from './profile';
import { sessionService } from './session';
import { tokenStorage } from '../../lib/tokenStorage';
import { useAuthStore } from '../../store/authStore';

export class SessionManager {
  static refreshTimer = null;

  static setAccessToken(token) {
    tokenStorage.setAccessToken(token);
  }

  static getUser() {
    return useAuthStore.getState().user;
  }

  static async initialize(options = {}) {
    try {
      // If already on /login page, don't auto-attempt background refresh
      const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';

      if (!tokenStorage.getAccessToken() && !isLoginPage) {
        try {
          const tokenData = await authService.refreshToken();
          if (tokenData?.access_token) {
            tokenStorage.setAccessToken(tokenData.access_token);
          }
        } catch (refreshErr) {
          // Ignore background refresh failure on initialization
        }
      }

      const token = tokenStorage.getAccessToken();

      // Try fetching profile via profileService if token exists
      if (token) {
        try {
          const user = await profileService.getProfile(options);
          useAuthStore.getState().setUser(user);
          SessionManager.scheduleRefresh();
          return user;
        } catch (profileErr) {
          // Decode JWT payload for user info if getProfile fails or is unauthenticated
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const payload = JSON.parse(jsonPayload);
            
            const fallbackUser = {
              id: payload.sub,
              email: payload.email,
              name: payload.email ? payload.email.split('@')[0] : 'User',
              role: payload.role || 'student',
            };
            useAuthStore.getState().setUser(fallbackUser);
            useAuthStore.setState({ isLoading: false, isInitialized: true });
            return fallbackUser;
          } catch (jwtErr) {
            tokenStorage.removeAccessToken();
            useAuthStore.getState().clearAuth();
          }
        }
      }

      // Default unauthenticated state
      useAuthStore.getState().clearAuth();
      return null;
    } catch (error) {
      useAuthStore.getState().clearAuth();
      return null;
    }
  }

  static scheduleRefresh() {
    SessionManager.clearRefreshTimer();
    const FOURTEEN_MINUTES = 14 * 60 * 1000;
    SessionManager.refreshTimer = setTimeout(async () => {
      try {
        const token = tokenStorage.getAccessToken();
        if (token) {
          const data = await authService.refreshToken(token);
          if (data?.access_token) {
            tokenStorage.setAccessToken(data.access_token);
          }
        }
        SessionManager.scheduleRefresh();
      } catch (err) {
        SessionManager.logout();
      }
    }, FOURTEEN_MINUTES);
  }

  static clearRefreshTimer() {
    if (SessionManager.refreshTimer) {
      clearTimeout(SessionManager.refreshTimer);
      SessionManager.refreshTimer = null;
    }
  }

  static async logout() {
    SessionManager.clearRefreshTimer();
    try {
      await sessionService.logout();
    } catch (err) {
      // Ignore logout API failures
    } finally {
      tokenStorage.removeAccessToken();
      useAuthStore.getState().clearAuth();
    }
  }
}
