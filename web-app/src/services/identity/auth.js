import { apiClient } from '../api/client';

export const authService = {
  getGoogleLoginUrl: () => {
    const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8000/api/v1';
    return `${gatewayUrl}/oauth/google/login`;
  },
  refreshToken: async (token) => {
    const res = await apiClient.post('/tokens/refresh', { refresh_token: token });
    return res.data;
  },
};
