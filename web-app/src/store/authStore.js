import { create } from 'zustand';
import { STORAGE_KEYS, ROUTES } from '@/config/constants';
import { useWorkspaceStore } from './workspaceStore';
import { queryClient } from '@/lib/queryClient';
import { broadcastAuthEvent, subscribeAuthBroadcast } from '@/lib/authBroadcast';

let proactiveRefreshTimer = null;

function parseJwtPayload(jwtToken) {
  if (!jwtToken || typeof jwtToken !== 'string' || !jwtToken.includes('.')) return null;
  try {
    return JSON.parse(atob(jwtToken.split('.')[1]));
  } catch {
    return null;
  }
}

function parseUserSub(jwtToken) {
  const payload = parseJwtPayload(jwtToken);
  return payload?.sub || payload?.user_id || payload?.id || null;
}

/**
 * Schedules a quiet proactive background token refresh 3 minutes before JWT expiration.
 * Prevents mid-stream disconnections on long-running AI RAG generations or file uploads.
 */
function scheduleProactiveRefresh(token) {
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }

  if (!token) return;

  const payload = parseJwtPayload(token);
  if (!payload?.exp) return;

  const expMs = payload.exp * 1000;
  const now = Date.now();
  const remainingMs = expMs - now;

  // Refresh 3 minutes before expiration, or after 10s if already within the last 3 minutes
  const refreshLeadTime = 3 * 60 * 1000;
  const delay = Math.max(remainingMs - refreshLeadTime, 10000);

  proactiveRefreshTimer = setTimeout(async () => {
    try {
      const { authApi } = await import('@/features/auth/api/authApi');
      const data = await authApi.refreshToken();
      if (data?.access_token) {
        useAuthStore.getState().setToken(data.access_token, { broadcast: false });
      }
    } catch {
      // Safe fallback: reactive 401 response interceptor handles re-auth on next call
    }
  }, delay);
}

export const useAuthStore = create((set, get) => ({
  token: null,
  isAuthenticated: false,

  setToken: (token, { broadcast = false } = {}) => {
    const prevToken = get().token;
    const prevUser = parseUserSub(prevToken);
    const nextUser = parseUserSub(token);

    // If switching accounts or logging in as different user, clear query cache
    if (token && prevToken && prevUser && nextUser && prevUser !== nextUser) {
      try {
        queryClient.clear();
      } catch (e) {
        // Safe catch for isolated testing environments
      }
      useWorkspaceStore.getState().clearActiveWorkspace();
    }

    if (token) {
      scheduleProactiveRefresh(token);
      set({ token, isAuthenticated: true });
      if (broadcast) {
        broadcastAuthEvent('LOGIN');
      }
    } else {
      if (proactiveRefreshTimer) {
        clearTimeout(proactiveRefreshTimer);
        proactiveRefreshTimer = null;
      }
      set({ token: null, isAuthenticated: false });
    }
  },

  setAuth: (token, options) => {
    get().setToken(token, options);
  },

  clearAuth: ({ broadcast = true } = {}) => {
    if (proactiveRefreshTimer) {
      clearTimeout(proactiveRefreshTimer);
      proactiveRefreshTimer = null;
    }

    // Abort and reject any pending 401 queued promises immediately
    import('@/lib/api')
      .then(({ abortRefreshQueue }) => abortRefreshQueue('User logged out'))
      .catch(() => {});

    // Purge legacy storage items if present
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem('synapse_user');
    localStorage.removeItem('synapse_active_workspace');
    useWorkspaceStore.getState().clearActiveWorkspace();
    try {
      queryClient.clear();
    } catch (e) {
      // Safe catch for isolated testing environments
    }

    set({ token: null, isAuthenticated: false });

    if (broadcast) {
      broadcastAuthEvent('LOGOUT');
    }
  },
}));

// Cross-tab Synchronization Listener: BroadcastChannel / window storage sync
if (typeof window !== 'undefined') {
  subscribeAuthBroadcast((event) => {
    if (event?.type === 'LOGOUT') {
      useAuthStore.getState().clearAuth({ broadcast: false });
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = ROUTES.LOGIN;
      }
    } else if (event?.type === 'LOGIN') {
      import('@/features/auth/api/authApi')
        .then(({ authApi }) => authApi.refreshToken())
        .then((data) => {
          if (data?.access_token) {
            useAuthStore.getState().setToken(data.access_token, { broadcast: false });
          }
        })
        .catch(() => {});
    }
  });
}

export default useAuthStore;
