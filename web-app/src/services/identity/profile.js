import { apiClient } from '../api/client';

export const profileService = {
  getProfile: async () => {
    const res = await apiClient.get('/profile');
    return res.data;
  },
  updateProfile: async (data) => {
    const res = await apiClient.patch('/profile', data);
    return res.data;
  },
};
