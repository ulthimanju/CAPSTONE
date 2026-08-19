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
 * Acts as the authoritative server state for user identity.
 */
export function useProfileQuery(options = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: AUTH_QUERY_KEYS.PROFILE,
    queryFn: () => authApi.getProfile(),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    ...options,
  });
}

/**
 * Convenience hook returning the current authoritative user profile.
 */
export function useCurrentUser() {
  const { data: user, isLoading, isError, error, refetch } = useProfileQuery();
  return { user: user || null, isLoading, isError, error, refetch };
}

/**
 * Query hook for active user sessions and devices.
 */
export function useSessionsQuery(options = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: AUTH_QUERY_KEYS.SESSIONS,
    queryFn: () => authApi.getSessions(),
    enabled: Boolean(token),
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Mutation hook for revoking a specific active session.
 * 
 * Security Guard-Rail:
 * Non-optimistic execution ensures the session is confirmed revoked on the server (HTTP 204)
 * before removing it from client cache, preventing false security confidence on network failures.
 */
export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId) => authApi.revokeSession(sessionId),
    onSuccess: (_, sessionId) => {
      // 1. Instant cache update upon confirmed server 2xx
      queryClient.setQueryData(AUTH_QUERY_KEYS.SESSIONS, (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((s) => s.id !== sessionId);
      });
      // 2. Non-blocking background revalidation safety net
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.SESSIONS });
      toast.success('Session revoked successfully.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to revoke session.'));
    },
  });
}

/**
 * Mutation hook for revoking all sessions except the active device.
 * 
 * Security Guard-Rail:
 * Non-optimistic execution guarantees the backend logout-all transaction completes
 * before updating local session state, followed by non-blocking background revalidation.
 */
export function useRevokeAllSessionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.revokeAllSessions(),
    onSuccess: () => {
      const token = useAuthStore.getState().token;
      let currentSessionId = null;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentSessionId = payload.session_id || payload.sid || payload.jti;
        } catch {
          // ignore decode error
        }
      }

      // 1. Instant cache update upon confirmed server 2xx
      queryClient.setQueryData(AUTH_QUERY_KEYS.SESSIONS, (old) => {
        if (!Array.isArray(old)) return old;
        if (currentSessionId) {
          return old.filter((s) => s.id === currentSessionId);
        }
        return old.length > 0 ? [old[0]] : [];
      });
      // 2. Non-blocking background revalidation safety net
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
    enabled: Boolean(token),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook providing a structured logout function.
 * Invalidates and wipes all query caches and credential tokens.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  return () => {
    queryClient.clear(); // purge all server-cached queries
    clearAuth(); // purge access token and active workspace ID
    toast.info('Signed out successfully.');
    navigate(ROUTES.LOGIN, { replace: true });
  };
}
