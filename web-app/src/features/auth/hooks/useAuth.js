import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '../api/authApi';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/config/constants';
import { getErrorMessage } from '@/utils/errors';

export const AUTH_QUERY_KEYS = {
  PROFILE: ['auth', 'profile'],
  GOOGLE_DRIVE: ['auth', 'google-drive'],
  SESSIONS: ['auth', 'sessions'],
};

/**
 * Query hook for current authenticated user profile.
 */
export function useProfileQuery(options = {}) {
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);

  return useQuery({
    queryKey: AUTH_QUERY_KEYS.PROFILE,
    queryFn: async () => {
      const profile = await authApi.getProfile();
      setUser(profile);
      return profile;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    ...options,
  });
}

/**
 * Mutation hook for updating user display name or avatar.
 */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(AUTH_QUERY_KEYS.PROFILE, updatedUser);
      toast.success('Profile updated successfully.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update profile.'));
    },
  });
}

/**
 * Query hook for checking Google Drive integration status.
 */
export function useGoogleDriveStatusQuery(options = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: AUTH_QUERY_KEYS.GOOGLE_DRIVE,
    queryFn: () => authApi.checkGoogleDriveStatus(),
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook providing a structured logout function.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  return () => {
    clearAuth();
    queryClient.clear();
    toast.info('Signed out successfully.');
    navigate(ROUTES.LOGIN, { replace: true });
  };
}
