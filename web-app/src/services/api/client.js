import axios from 'axios';
import { apiConfig } from '../../config/api';
import { API_ENDPOINTS } from '../../constants/api';
import { tokenStorage } from '../../lib/tokenStorage';
import { ApiError } from '../../lib/apiError';
import { useAuthStore } from '../../store/authStore';

const API_BASE_URL = apiConfig.baseUrl;

export const apiClient = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Shared logout handler for session expiry
export function triggerSessionExpiredLogout() {
  tokenStorage.removeAccessToken();
  try {
    useAuthStore.getState().clearAuth();
  } catch (e) {}

  window.dispatchEvent(new CustomEvent('session:expired'));

  // ONLY redirect if we are not already on the login page
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login?reason=session_expired';
  }
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

// Coalesce in-flight refresh requests
let _refreshPromise = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Do NOT intercept if this was already a refresh request or a retry
    if (originalRequest?._isRefreshCall || originalRequest?._retry) {
      return Promise.reject(ApiError.fromAxiosError(error));
    }

    if (status === 401) {
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
        if (access_token) {
          tokenStorage.setAccessToken(access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
        throw new Error('No access_token in refresh response');
      } catch (refreshError) {
        triggerSessionExpiredLogout();
        return Promise.reject(ApiError.fromAxiosError(refreshError));
      }
    }

    return Promise.reject(ApiError.fromAxiosError(error));
  }
);
