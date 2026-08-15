import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import summaryApi from '../api/summaryApi';
import { useWorkspaceDocumentSSE } from '@/features/documents/hooks/useDocuments';

export const SUMMARY_QUERY_KEY = 'workspace-summary';

export function useWorkspaceSummaryQuery(workspaceId) {
  const queryClient = useQueryClient();

  // Listen to real-time platform events (e.g. SummaryGeneration COMPLETED / FAILED)
  useWorkspaceDocumentSSE(workspaceId);

  return useQuery({
    queryKey: [SUMMARY_QUERY_KEY, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      return summaryApi.getWorkspaceSummary(workspaceId);
    },
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGenerateSummaryMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return summaryApi.generateWorkspaceSummary(workspaceId);
    },
    onSuccess: () => {
      // Invalidate workspace details and summary
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId] });
      queryClient.invalidateQueries({ queryKey: [SUMMARY_QUERY_KEY, workspaceId] });
    },
  });
}
