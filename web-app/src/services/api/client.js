import axios from 'axios';
import { apiConfig } from '../../config/api';
import { API_ENDPOINTS } from '../../constants/api';
import { tokenStorage } from '../../lib/tokenStorage';
import { ApiError } from '../../lib/apiError';

const API_BASE_URL = apiConfig.baseUrl;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.TOKENS.REFRESH}`, {}, { withCredentials: true });
        const { access_token } = res.data;
        tokenStorage.setAccessToken(access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        tokenStorage.removeAccessToken();
        window.location.href = '/login';
        return Promise.reject(ApiError.fromAxiosError(refreshError));
      }
    }
    return Promise.reject(ApiError.fromAxiosError(error));
  }
);
