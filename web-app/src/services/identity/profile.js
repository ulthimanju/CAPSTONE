import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../../constants/api';
import { UserMapper } from './mappers';

export const profileService = {
  getProfile: async (options = {}) => {
    const res = await apiClient.get(API_ENDPOINTS.PROFILE.GET, options);
    return UserMapper.toDomain(res.data);
  },
  updateProfile: async (data, options = {}) => {
    const res = await apiClient.patch(API_ENDPOINTS.PROFILE.UPDATE, data, options);
    return UserMapper.toDomain(res.data);
  },
};
