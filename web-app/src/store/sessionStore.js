import { create } from 'zustand';

export const useSessionStore = create((set) => ({
  sessions: [],
  isLoading: false,

  setSessions: (sessions) => set({ sessions, isLoading: false }),
  removeSession: (id) => set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) })),
  clearSessions: () => set({ sessions: [] }),
}));
