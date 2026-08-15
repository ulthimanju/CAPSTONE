import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import learningPathApi from '../api/learningPathApi';
import { useWorkspaceDocumentSSE } from '@/features/documents/hooks/useDocuments';

export const LEARNING_PATH_QUERY_KEY = 'workspace-learning-path';

export function useWorkspaceLearningPathQuery(workspaceId) {
  const queryClient = useQueryClient();

  // Listen to real-time platform events (e.g. LearningPathGeneration COMPLETED / FAILED)
  useWorkspaceDocumentSSE(workspaceId);

  return useQuery({
    queryKey: [LEARNING_PATH_QUERY_KEY, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const res = await learningPathApi.getWorkspaceLearningPath(workspaceId);
      return res?.learning_path || null;
    },
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGenerateLearningPathMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return learningPathApi.generateWorkspaceLearningPath(workspaceId);
    },
    onSuccess: () => {
      // Invalidate workspace details and learning path
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId] });
      queryClient.invalidateQueries({ queryKey: [LEARNING_PATH_QUERY_KEY, workspaceId] });
    },
  });
}
