import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false, isInitialized: true }),
  clearAuth: () => set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true }),
}));
