import { create } from 'zustand';
import { STORAGE_KEYS } from '@/config/constants';
import { useWorkspaceStore } from './workspaceStore';
import { queryClient } from '@/lib/queryClient';

function parseUserSub(jwtToken) {
  if (!jwtToken || typeof jwtToken !== 'string' || !jwtToken.includes('.')) return null;
  try {
    const payload = JSON.parse(atob(jwtToken.split('.')[1]));
    return payload.sub || payload.user_id || payload.id || null;
  } catch {
    return null;
  }
}

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null,
  isAuthenticated: Boolean(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)),

  setToken: (token) => {
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
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      set({ token, isAuthenticated: true });
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      set({ token: null, isAuthenticated: false });
    }
  },

  setAuth: (token) => {
    get().setToken(token);
  },

  clearAuth: () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem('synapse_user'); // cleanup legacy key if present
    localStorage.removeItem('synapse_active_workspace');
    useWorkspaceStore.getState().clearActiveWorkspace();
    try {
      queryClient.clear();
    } catch (e) {
      // Safe catch for isolated testing environments
    }
    set({ token: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
