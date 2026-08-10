import axios from 'axios';
import { apiConfig } from '../../config/api';
import { API_ENDPOINTS } from '../../constants/api';
import { tokenStorage } from '../../lib/tokenStorage';
import { ApiError } from '../../lib/apiError';

const API_BASE_URL = apiConfig.baseUrl;

export const apiClient = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Shared logout — clears token, dispatches a global event so all components (SSE, etc.) react
let _isLoggingOut = false;
export function triggerSessionExpiredLogout() {
  if (_isLoggingOut) return;
  _isLoggingOut = true;
  tokenStorage.removeAccessToken();
  // Give in-flight requests a tick to resolve before hard redirect
  setTimeout(() => {
    _isLoggingOut = false;
    window.dispatchEvent(new CustomEvent('session:expired'));
    window.location.href = '/login?reason=session_expired';
  }, 100);
}

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.url && !config.url.startsWith('http')) {
    if (!config.url.startsWith('/api/v1')) {
      const cleanUrl = config.url.startsWith('/') ? config.url : `/${config.url}`;
      config.url = `/api/v1${cleanUrl}`;
    }
  }
  return config;
});

// Track in-progress refresh to avoid parallel refresh races
let _refreshPromise = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Only attempt refresh on 401, never on the refresh call itself, and only once
    if (status === 401 && !originalRequest._retry && !originalRequest._isRefreshCall) {
      originalRequest._retry = true;

      // Coalesce concurrent 401s into a single refresh call
      if (!_refreshPromise) {
        _refreshPromise = axios
          .post(
            `${API_BASE_URL}${API_ENDPOINTS.TOKENS.REFRESH}`,
            {},
            { withCredentials: true, _isRefreshCall: true }
          )
          .finally(() => {
            _refreshPromise = null;
          });
      }

      try {
        const res = await _refreshPromise;
        const { access_token } = res.data;
        tokenStorage.setAccessToken(access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed (401 = expired, 404 = wrong path, 400 = invalid token)
        // → force logout, do NOT retry further
        triggerSessionExpiredLogout();
        return Promise.reject(ApiError.fromAxiosError(refreshError));
      }
    }

    return Promise.reject(ApiError.fromAxiosError(error));
  }
);
