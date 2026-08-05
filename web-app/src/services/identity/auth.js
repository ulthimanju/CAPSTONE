import { apiClient } from '../api/client';
import { apiConfig } from '../../config/api';

export const authService = {
  getGoogleLoginUrl: () => {
    return `${apiConfig.baseUrl}/oauth/google/login`;
  },
  refreshToken: async (token) => {
    const res = await apiClient.post('/tokens/refresh', { refresh_token: token });
    return res.data;
  },
};
