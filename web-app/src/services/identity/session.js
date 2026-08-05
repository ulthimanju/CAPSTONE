import { apiClient } from '../api/client';

export const sessionService = {
  getSessions: async () => {
    const res = await apiClient.get('/sessions');
    return res.data;
  },
  logout: async () => {
    await apiClient.post('/sessions/logout');
    localStorage.removeItem('access_token');
  },
  logoutAll: async () => {
    await apiClient.post('/sessions/logout-all');
    localStorage.removeItem('access_token');
  },
  revokeSession: async (sessionId) => {
    await apiClient.delete(`/sessions/${sessionId}`);
  },
};
