import { create } from 'zustand';
import { STORAGE_KEYS } from '@/config/constants';

export const useAuthStore = create((set) => ({
  user: (() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null,
  isAuthenticated: !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),

  setToken: (token) => {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      set({ token, isAuthenticated: true });
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      set({ token: null, isAuthenticated: false });
    }
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      set({ user });
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
      set({ user: null });
    }
  },

  setAuth: (token, user) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
    set({ token, user: user || null, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
