import { apiClient } from '../api/client';
import { UserMapper } from './mappers';

export const profileService = {
  getProfile: async () => {
    const res = await apiClient.get('/profile');
    return UserMapper.toDomain(res.data);
  },
  updateProfile: async (data) => {
    const res = await apiClient.patch('/profile', data);
    return UserMapper.toDomain(res.data);
  },
};
