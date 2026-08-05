import { create } from 'zustand';
import { tokenStorage } from '../lib/storage';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  clearAuth: () => {
    tokenStorage.removeAccessToken();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
