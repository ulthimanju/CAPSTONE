import { create } from 'zustand';
import { STORAGE_KEYS } from '@/config/constants';
import { useWorkspaceStore } from './workspaceStore';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null,
  isAuthenticated: Boolean(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)),

  setToken: (token) => {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      set({ token, isAuthenticated: true });
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      set({ token: null, isAuthenticated: false });
    }
  },

  setAuth: (token) => {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      set({ token, isAuthenticated: true });
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      set({ token: null, isAuthenticated: false });
    }
  },

  clearAuth: () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem('synapse_user'); // cleanup legacy key if present
    localStorage.removeItem('synapse_active_workspace');
    useWorkspaceStore.getState().clearActiveWorkspace();
    set({ token: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
