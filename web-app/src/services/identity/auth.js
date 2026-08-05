import { apiClient } from '../api/client';
import { apiConfig } from '../../config/api';
import { API_ENDPOINTS } from '../../constants/api';

export const authService = {
  getGoogleLoginUrl: () => {
    return `${apiConfig.baseUrl}${API_ENDPOINTS.OAUTH.GOOGLE_LOGIN}`;
  },
  refreshToken: async (token = null) => {
    const payload = token ? { refresh_token: token } : {};
    const res = await apiClient.post(API_ENDPOINTS.TOKENS.REFRESH, payload);
    return res.data;
  },

};
