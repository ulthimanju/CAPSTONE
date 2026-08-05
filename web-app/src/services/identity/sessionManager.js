import { authService } from './auth';
import { profileService } from './profile';
import { sessionService } from './session';
import { tokenStorage } from '../../lib/storage';
import { useAuthStore } from '../../store/authStore';

export class SessionManager {
  static refreshTimer = null;

  static async initialize(options = {}) {
    try {
      // 1. Validate startup session / fetch profile
      const user = await profileService.getProfile(options);
      useAuthStore.getState().setUser(user);
      SessionManager.scheduleRefresh();
      return user;
    } catch (error) {
      if (error.name === 'CanceledError' || error.name === 'AbortError') {
        throw error;
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        SessionManager.logout();
      } else {
        useAuthStore.setState({ isLoading: false, isInitialized: true });
      }
      throw error;
    }
  }

  static scheduleRefresh() {
    SessionManager.clearRefreshTimer();
    // Schedule refresh every 14 minutes (before 15 min JWT expiration)
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
