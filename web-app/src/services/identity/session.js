import { apiClient } from '../api/client';
import { tokenStorage } from '../../lib/storage';

export const sessionService = {
  getSessions: async (options = {}) => {
    const res = await apiClient.get('/sessions', options);
    return res.data;
  },
  logout: async () => {
    await apiClient.post('/sessions/logout');
    tokenStorage.removeAccessToken();
  },
  logoutAll: async () => {
    await apiClient.post('/sessions/logout-all');
    tokenStorage.removeAccessToken();
  },
  revokeSession: async (sessionId) => {
    await apiClient.delete(`/sessions/${sessionId}`);
  },
};
