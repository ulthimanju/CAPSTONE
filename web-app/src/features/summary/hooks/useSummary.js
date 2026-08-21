import { useQuery, useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query';
import summaryApi from '../api/summaryApi';
import { useWorkspaceDocumentSSE } from '@/features/documents/hooks/useDocuments';
import { workspaceKeys } from '@/features/workspaces/hooks/workspaceKeys';
import { useWorkspaceGenerationStatusQuery } from '@/features/workspaces/hooks/useWorkspaces';

export const SUMMARY_QUERY_KEY = 'workspace-summary';

/**
 * Authoritative hook to determine whether summary generation is actively in progress.
 * Consolidates backend generation job state and local in-flight mutation state.
 */
export function useIsSummaryGenerating(workspaceId) {
  const { data: genStatus } = useWorkspaceGenerationStatusQuery(workspaceId);
  const isMutatingCount = useIsMutating({
    mutationKey: ['workspace-summary-generate', workspaceId],
  });

  const isBackendRunning =
    genStatus?.summary_status === 'RUNNING' || genStatus?.summary_status === 'QUEUED';

  return isBackendRunning || isMutatingCount > 0;
}

export function useWorkspaceSummaryQuery(workspaceId) {
  const isGenerating = useIsSummaryGenerating(workspaceId);

  // Listen to real-time platform events (e.g. SummaryGeneration COMPLETED / FAILED)
  useWorkspaceDocumentSSE(workspaceId);

  return useQuery({
    queryKey: [SUMMARY_QUERY_KEY, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const data = await summaryApi.getWorkspaceSummary(workspaceId);
      return data;
    },
    enabled: Boolean(workspaceId),
    refetchInterval: isGenerating ? 2500 : false,
    staleTime: isGenerating ? 0 : 10 * 1000,
  });
}

export function useGenerateSummaryMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['workspace-summary-generate', workspaceId],
    mutationFn: async () => {
      return summaryApi.generateWorkspaceSummary(workspaceId);
    },
    onMutate: async () => {
      queryClient.setQueryData(workspaceKeys.generationStatus(workspaceId), (old) => ({
        ...(old || {}),
        summary_status: 'RUNNING',
      }));
    },
    onSuccess: () => {
      // Invalidate workspace details, summary, and generation-status
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.generationStatus(workspaceId) });
      queryClient.invalidateQueries({ queryKey: [SUMMARY_QUERY_KEY, workspaceId] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.generationStatus(workspaceId) });
    },
  });
}
