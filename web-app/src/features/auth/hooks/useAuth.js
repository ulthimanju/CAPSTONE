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
 * Query hook for active user sessions and devices.
 */
export function useSessionsQuery(options = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: AUTH_QUERY_KEYS.SESSIONS,
    queryFn: () => authApi.getSessions(),
    enabled: !!token,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Mutation hook for revoking a specific active session.
 */
export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.SESSIONS });
      toast.success('Session revoked successfully.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to revoke session.'));
    },
  });
}

/**
 * Mutation hook for revoking all sessions.
 */
export function useRevokeAllSessionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.revokeAllSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.SESSIONS });
      toast.success('All other sessions signed out.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to sign out other sessions.'));
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
