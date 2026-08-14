import { create } from 'zustand';
import { apiClient } from '@/services/api/client';

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  isLoading: false,
  isInitialized: false,
  error: null,

  fetchWorkspaces: async (user, force = false) => {
    // If already initialized and not forced, return cached list
    if (get().isInitialized && !force && get().workspaces.length > 0) {
      return get().workspaces;
    }

    set({ isLoading: true, error: null });

    try {
      const headers = {};
      if (user?.id) headers['X-User-ID'] = user.id;
      if (user?.email) headers['X-User-Email'] = user.email;

      const res = await apiClient.get('/api/v1/workspaces', { headers });
      const list = Array.isArray(res.data) ? res.data : (res.data?.workspaces ?? []);

      set({ workspaces: list, isLoading: false, isInitialized: true, error: null });
      return list;
    } catch (err) {
      console.error('[workspaceStore] Failed to fetch workspaces:', err);
      set({ error: err?.message || 'Failed to load workspaces', isLoading: false, isInitialized: true });
      return [];
    }
  },

  addWorkspace: (workspace) => {
    set((state) => ({
      workspaces: [workspace, ...state.workspaces.filter((w) => w.id !== workspace.id)],
    }));
  },

  reset: () => {
    set({ workspaces: [], isLoading: false, isInitialized: false, error: null });
  },
}));
