import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '../api/authApi';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/config/constants';
import { getErrorMessage } from '@/utils/errors';

export const AUTH_QUERY_KEYS = {
  PROFILE: ['auth', 'profile'],
  BOOTSTRAP: ['auth', 'bootstrap'],
  GOOGLE_DRIVE: ['auth', 'google-drive'],
  SESSIONS: ['auth', 'sessions'],
};

export const AUTH_STATUS = {
  UNKNOWN: 'UNKNOWN', // Initializing or validating credentials with backend
  AUTHENTICATED: 'AUTHENTICATED', // Confirmed valid session with loaded profile
  UNAUTHENTICATED: 'UNAUTHENTICATED', // No token, or revoked/expired token
};

/**
 * Query hook for initial silent session restore via httpOnly refresh cookie.
 * Ensures in-memory access tokens are seamlessly acquired on F5 reload.
 */
export function useAuthBootstrapQuery() {
  const token = useAuthStore((state) => state.token);
  const setToken = useAuthStore((state) => state.setToken);

  return useQuery({
    queryKey: AUTH_QUERY_KEYS.BOOTSTRAP,
    queryFn: async () => {
      try {
        const data = await authApi.refreshToken();
        if (data?.access_token) {
          setToken(data.access_token);
          return data;
        }
        return null;
      } catch {
        return null;
      }
    },
    enabled: !token,
    staleTime: Infinity,
    retry: false,
  });
}

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
    retry: false, // Do not loop if 401
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
 * Tri-state authentication status hook for robust route guarding and UI lifecycle.
 * Prevents false positives from stale tokens and prevents premature bounces.
 */
export function useAuthStatus() {
  const token = useAuthStore((state) => state.token);
  const { isLoading: isBootstrapping } = useAuthBootstrapQuery();

  const { data: user, isLoading: isProfileLoading, isError } = useProfileQuery({
    enabled: Boolean(token),
  });

  if (!token) {
    if (isBootstrapping) {
      return {
        status: AUTH_STATUS.UNKNOWN,
        user: null,
        isLoading: true,
        isAuthenticated: false,
      };
    }

    return {
      status: AUTH_STATUS.UNAUTHENTICATED,
      user: null,
      isLoading: false,
      isAuthenticated: false,
    };
  }

  if (isProfileLoading) {
    return {
      status: AUTH_STATUS.UNKNOWN,
      user: null,
      isLoading: true,
      isAuthenticated: false,
    };
  }

  if (isError || !user) {
    return {
      status: AUTH_STATUS.UNAUTHENTICATED,
      user: null,
      isLoading: false,
      isAuthenticated: false,
    };
  }

  return {
    status: AUTH_STATUS.AUTHENTICATED,
    user,
    isLoading: false,
    isAuthenticated: true,
  };
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
    mutationFn: () => {
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
      return authApi.revokeAllSessions(currentSessionId);
    },
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

  return async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors during logout
    }
    queryClient.clear(); // purge all server-cached queries
    clearAuth(); // purge in-memory access token and active workspace ID
    toast.info('Signed out successfully.');
    navigate(ROUTES.LOGIN, { replace: true });
  };
}
