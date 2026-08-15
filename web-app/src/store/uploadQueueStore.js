import { create } from 'zustand';

export const uploadQueueStore = create((set, get) => ({
  items: [],
  isExpanded: true,
  isVisible: false,

  setExpanded: (isExpanded) => set({ isExpanded }),
  setVisible: (isVisible) => set({ isVisible }),

  enqueueFiles: (workspaceId, filesWithMeta) => {
    set((state) => ({
      items: [
        ...state.items,
        ...filesWithMeta.map((f) => ({
          id: f.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          workspaceId,
          file: f.file,
          name: f.name || f.file?.name,
          size: f.size || f.file?.size,
          progress: 0,
          status: f.status || 'QUEUED', // 'QUEUED' | 'UPLOADING' | 'COMPLETED' | 'FAILED'
          error: f.error || null,
        })),
      ],
      isVisible: true,
      isExpanded: true,
    }));
  },

  updateItemProgress: (id, progress) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, progress, status: progress === 100 ? 'PROCESSING' : 'UPLOADING' } : item
      ),
    }));
  },

  setItemCompleted: (id) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, status: 'COMPLETED', progress: 100 } : item
      ),
    }));
  },

  setItemFailed: (id, errorMsg) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, status: 'FAILED', error: errorMsg } : item
      ),
    }));
  },

  clearCompleted: () => {
    set((state) => {
      const remaining = state.items.filter((item) => item.status !== 'COMPLETED');
      return {
        items: remaining,
        isVisible: remaining.length > 0,
      };
    });
  },

  dismissAll: () => {
    set({ items: [], isVisible: false });
  },
}));

export const useUploadQueueStore = uploadQueueStore;
