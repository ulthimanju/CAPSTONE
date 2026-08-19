import { create } from 'zustand';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import summaryApi from '../api/summaryApi';
import { useWorkspaceDocumentSSE } from '@/features/documents/hooks/useDocuments';
import { workspaceKeys } from '@/features/workspaces/hooks/workspaceKeys';

export const SUMMARY_QUERY_KEY = 'workspace-summary';

export const useSummaryStore = create((set, get) => ({
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

export function useWorkspaceSummaryQuery(workspaceId) {
  const queryClient = useQueryClient();
  const setGenerating = useSummaryStore((state) => state.setGenerating);
  const isGenerating = useSummaryStore((state) =>
    Boolean(state.generatingWorkspaces[workspaceId])
  );

  // Listen to real-time platform events (e.g. SummaryGeneration COMPLETED / FAILED)
  useWorkspaceDocumentSSE(workspaceId);

  return useQuery({
    queryKey: [SUMMARY_QUERY_KEY, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const data = await summaryApi.getWorkspaceSummary(workspaceId);
      const summary = data?.summary;
      if (summary && (summary.overview || (summary.sections && summary.sections.length > 0))) {
        setGenerating(workspaceId, false);
      }
      return data;
    },
    enabled: Boolean(workspaceId),
    refetchInterval: isGenerating ? 2500 : false,
    staleTime: isGenerating ? 0 : 10 * 1000,
  });
}

export function useGenerateSummaryMutation(workspaceId) {
  const queryClient = useQueryClient();
  const setGenerating = useSummaryStore((state) => state.setGenerating);

  return useMutation({
    mutationFn: async () => {
      setGenerating(workspaceId, true);
      return summaryApi.generateWorkspaceSummary(workspaceId);
    },
    onSuccess: () => {
      setGenerating(workspaceId, true);
      // Invalidate workspace details and summary
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
      queryClient.invalidateQueries({ queryKey: [SUMMARY_QUERY_KEY, workspaceId] });
    },
    onError: () => {
      setGenerating(workspaceId, false);
    },
  });
}
