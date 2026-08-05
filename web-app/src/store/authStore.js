import { create } from 'zustand';
import { tokenStorage } from '../lib/storage';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false, isInitialized: true }),
  clearAuth: () => {
    tokenStorage.removeAccessToken();
    set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
  },
}));
