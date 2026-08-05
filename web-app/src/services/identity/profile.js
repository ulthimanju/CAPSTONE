import { apiClient } from '../api/client';
import { UserMapper } from './mappers';

export const profileService = {
  getProfile: async (options = {}) => {
    const res = await apiClient.get('/profile', options);
    return UserMapper.toDomain(res.data);
  },
  updateProfile: async (data, options = {}) => {
    const res = await apiClient.patch('/profile', data, options);
    return UserMapper.toDomain(res.data);
  },
};
