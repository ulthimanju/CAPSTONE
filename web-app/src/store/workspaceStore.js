import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWorkspaceStore = create(
  persist(
    (set) => ({
      activeWorkspaceId: null,

      setActiveWorkspaceId: (workspaceId) => {
        set({ activeWorkspaceId: workspaceId });
      },

      clearActiveWorkspace: () => {
        set({ activeWorkspaceId: null });
      },
    }),
    {
      name: 'synapse_active_workspace',
    }
  )
);

export default useWorkspaceStore;
