import { create } from 'zustand';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import learningPathApi from '../api/learningPathApi';
import { useWorkspaceDocumentSSE } from '@/features/documents/hooks/useDocuments';

export const LEARNING_PATH_QUERY_KEY = 'workspace-learning-path';

export const useLearningPathStore = create((set, get) => ({
  generatingWorkspaces: {},
  setGenerating: (workspaceId, isGenerating) =>
    set((state) => ({
      generatingWorkspaces: {
        ...state.generatingWorkspaces,
        [workspaceId]: isGenerating,
      },
    })),
  isGenerating: (workspaceId) => Boolean(get().generatingWorkspaces[workspaceId]),
}));

export function useWorkspaceLearningPathQuery(workspaceId) {
  const queryClient = useQueryClient();
  const setGenerating = useLearningPathStore((state) => state.setGenerating);
  const isGenerating = useLearningPathStore((state) =>
    Boolean(state.generatingWorkspaces[workspaceId])
  );

  // Listen to real-time platform events (SSE)
  useWorkspaceDocumentSSE(workspaceId);

  return useQuery({
    queryKey: [LEARNING_PATH_QUERY_KEY, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const res = await learningPathApi.getWorkspaceLearningPath(workspaceId);
      const lp = res?.learning_path || null;
      if (lp && lp.units && Array.isArray(lp.units) && lp.units.length > 0) {
        setGenerating(workspaceId, false);
      }
      return lp;
    },
    enabled: Boolean(workspaceId),
    refetchInterval: isGenerating ? 2500 : false,
    staleTime: isGenerating ? 0 : 5 * 60 * 1000,
  });
}

export function useGenerateLearningPathMutation(workspaceId) {
  const queryClient = useQueryClient();
  const setGenerating = useLearningPathStore((state) => state.setGenerating);

  return useMutation({
    mutationFn: async () => {
      setGenerating(workspaceId, true);
      return learningPathApi.generateWorkspaceLearningPath(workspaceId);
    },
    onSuccess: () => {
      setGenerating(workspaceId, true);
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId] });
      queryClient.invalidateQueries({ queryKey: [LEARNING_PATH_QUERY_KEY, workspaceId] });
    },
    onError: () => {
      setGenerating(workspaceId, false);
    },
  });
}
