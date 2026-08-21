import { useQuery, useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query';
import learningPathApi from '../api/learningPathApi';
import { useWorkspaceDocumentSSE } from '@/features/documents/hooks/useDocuments';
import { workspaceKeys } from '@/features/workspaces/hooks/workspaceKeys';
import { useWorkspaceGenerationStatusQuery } from '@/features/workspaces/hooks/useWorkspaces';
import { learningPathKeys } from './learningPathKeys';

export { learningPathKeys };

/**
 * Authoritative hook to determine whether learning path generation is actively in progress.
 */
export function useIsLearningPathGenerating(workspaceId) {
  const { data: genStatus } = useWorkspaceGenerationStatusQuery(workspaceId);
  const isMutatingCount = useIsMutating({
    mutationKey: ['workspace-learning-path-generate', workspaceId],
  });

  const isBackendRunning =
    genStatus?.learning_path_status === 'RUNNING' || genStatus?.learning_path_status === 'QUEUED';

  return isBackendRunning || isMutatingCount > 0;
}

/**
 * Authoritative hook to determine whether unit content bundle generation is actively in progress.
 */
export function useIsUnitContentGenerating(workspaceId, unitId, unitTitle) {
  const { data: genStatus } = useWorkspaceGenerationStatusQuery(workspaceId);
  const targetKey = unitId || unitTitle;
  const isMutatingCount = useIsMutating({
    mutationKey: ['workspace-unit-generate', workspaceId, targetKey],
  });

  const backendUnitStatus =
    (unitId && genStatus?.unit_statuses?.[unitId]) ||
    (unitTitle && genStatus?.unit_statuses?.[unitTitle]);

  const isBackendRunning =
    backendUnitStatus === 'RUNNING' || backendUnitStatus === 'QUEUED';

  return isBackendRunning || isMutatingCount > 0;
}

export function useWorkspaceLearningPathQuery(workspaceId) {
  const isGenerating = useIsLearningPathGenerating(workspaceId);

  // Listen to real-time platform events (SSE)
  useWorkspaceDocumentSSE(workspaceId);

  return useQuery({
    queryKey: learningPathKeys.path(workspaceId),
    queryFn: async () => {
      if (!workspaceId) return null;
      const res = await learningPathApi.getWorkspaceLearningPath(workspaceId);
      const lp = res?.learning_path || null;
      return lp;
    },
    enabled: Boolean(workspaceId),
    refetchInterval: isGenerating ? 2500 : false,
    staleTime: isGenerating ? 0 : 10 * 1000,
  });
}

export function useGenerateLearningPathMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['workspace-learning-path-generate', workspaceId],
    mutationFn: async () => {
      return learningPathApi.generateWorkspaceLearningPath(workspaceId);
    },
    onMutate: async () => {
      queryClient.setQueryData(workspaceKeys.generationStatus(workspaceId), (old) => ({
        ...(old || {}),
        learning_path_status: 'RUNNING',
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.generationStatus(workspaceId) });
      queryClient.invalidateQueries({ queryKey: learningPathKeys.path(workspaceId) });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.generationStatus(workspaceId) });
    },
  });
}

export function useUnitContentQuery(workspaceId, unitTitle, unitId = null) {
  const isGeneratingUnit = useIsUnitContentGenerating(workspaceId, unitId, unitTitle);

  // Listen to real-time platform events (SSE)
  useWorkspaceDocumentSSE(workspaceId);

  return useQuery({
    queryKey: learningPathKeys.unit(workspaceId, unitTitle),
    queryFn: async () => {
      if (!workspaceId || !unitTitle) return null;
      const data = await learningPathApi.getLearningUnitContent(workspaceId, unitTitle);
      return data;
    },
    enabled: Boolean(workspaceId && unitTitle),
    refetchInterval: isGeneratingUnit ? 3000 : false,
    staleTime: isGeneratingUnit ? 0 : 10 * 1000,
  });
}

export function useGenerateUnitContentMutation(workspaceId, unitTitle, unitId = null) {
  const queryClient = useQueryClient();
  const targetKey = unitId || unitTitle;

  return useMutation({
    mutationKey: ['workspace-unit-generate', workspaceId, targetKey],
    mutationFn: async (payload) => {
      const title = payload?.unit_title || unitTitle;
      const uid = payload?.unit_id || unitId;
      return learningPathApi.generateLearningUnitContent(workspaceId, {
        unit_id: uid,
        unit_title: title,
        unit_description: payload?.unit_description || '',
        learning_objectives: payload?.learning_objectives || [],
        tags: payload?.tags || [],
      });
    },
    onMutate: async (payload) => {
      const title = payload?.unit_title || unitTitle;
      const uid = payload?.unit_id || unitId || title;
      queryClient.setQueryData(workspaceKeys.generationStatus(workspaceId), (old) => ({
        ...(old || {}),
        unit_statuses: {
          ...(old?.unit_statuses || {}),
          [uid]: 'RUNNING',
          ...(title ? { [title]: 'RUNNING' } : {}),
        },
      }));
    },
    onSuccess: (data, variables) => {
      const title = variables?.unit_title || unitTitle;
      queryClient.invalidateQueries({
        queryKey: learningPathKeys.unit(workspaceId, title),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.generationStatus(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: learningPathKeys.path(workspaceId),
      });
    },
    onError: (err, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.generationStatus(workspaceId),
      });
    },
  });
}

export function useUpdateQuizProgressMutation(workspaceId, unitTitle) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quizJson }) => {
      return learningPathApi.updateQuizProgress(workspaceId, {
        unitTitle,
        quizJson,
      });
    },
    onSuccess: (data, variables) => {
      const targetQuiz = variables?.quizJson;
      queryClient.setQueryData(learningPathKeys.unit(workspaceId, unitTitle), (old) => {
        if (!old) return old;
        return {
          ...old,
          content: {
            ...(old.content || {}),
            ...(targetQuiz ? { quiz: targetQuiz } : {}),
          },
        };
      });
    },
  });
}

export default useWorkspaceLearningPathQuery;
