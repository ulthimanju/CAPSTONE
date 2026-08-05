import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../../constants/api';
import { tokenStorage } from '../../lib/tokenStorage';

export const sessionService = {
  getSessions: async (options = {}) => {
    const res = await apiClient.get(API_ENDPOINTS.SESSIONS.LIST, options);
    return res.data;
  },
  logout: async () => {
    await apiClient.post(API_ENDPOINTS.SESSIONS.LOGOUT);
    tokenStorage.removeAccessToken();
  },
  logoutAll: async () => {
    await apiClient.post(API_ENDPOINTS.SESSIONS.LOGOUT_ALL);
    tokenStorage.removeAccessToken();
  },
  revokeSession: async (sessionId) => {
    await apiClient.delete(API_ENDPOINTS.SESSIONS.REVOKE(sessionId));
  },
};
