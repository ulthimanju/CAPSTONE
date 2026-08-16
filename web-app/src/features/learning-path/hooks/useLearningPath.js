import { create } from 'zustand';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import learningPathApi from '../api/learningPathApi';
import { useWorkspaceDocumentSSE } from '@/features/documents/hooks/useDocuments';

export const LEARNING_PATH_QUERY_KEY = 'workspace-learning-path';
export const LEARNING_UNIT_QUERY_KEY = 'learning-unit-content';

export const useLearningPathStore = create((set, get) => ({
  generatingWorkspaces: {},
  generatingUnits: {},

  setGenerating: (workspaceId, isGenerating) =>
    set((state) => ({
      generatingWorkspaces: {
        ...state.generatingWorkspaces,
        [workspaceId]: isGenerating,
      },
    })),

  setGeneratingUnit: (workspaceId, unitTitle, isGenerating) => {
    const key = `${workspaceId}:${unitTitle}`;
    set((state) => ({
      generatingUnits: {
        ...state.generatingUnits,
        [key]: isGenerating,
      },
    }));
  },

  isGenerating: (workspaceId) => Boolean(get().generatingWorkspaces[workspaceId]),
  isGeneratingUnit: (workspaceId, unitTitle) =>
    Boolean(get().generatingUnits[`${workspaceId}:${unitTitle}`]),
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
    staleTime: isGenerating ? 0 : 10 * 1000,
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

export function useUnitContentQuery(workspaceId, unitTitle) {
  const setGeneratingUnit = useLearningPathStore((state) => state.setGeneratingUnit);
  const isGeneratingUnit = useLearningPathStore((state) =>
    Boolean(state.generatingUnits[`${workspaceId}:${unitTitle}`])
  );

  // Listen to real-time platform events (SSE)
  useWorkspaceDocumentSSE(workspaceId);

  return useQuery({
    queryKey: [LEARNING_UNIT_QUERY_KEY, workspaceId, unitTitle],
    queryFn: async () => {
      if (!workspaceId || !unitTitle) return null;
      const data = await learningPathApi.getLearningUnitContent(workspaceId, unitTitle);
      if (data?.content && data?.status === 'READY') {
        setGeneratingUnit(workspaceId, unitTitle, false);
      }
      return data;
    },
    enabled: Boolean(workspaceId && unitTitle),
    refetchInterval: isGeneratingUnit ? 3000 : false,
    staleTime: isGeneratingUnit ? 0 : 10 * 1000,
  });
}

export function useGenerateUnitContentMutation(workspaceId, unitTitle) {
  const queryClient = useQueryClient();
  const setGeneratingUnit = useLearningPathStore((state) => state.setGeneratingUnit);

  return useMutation({
    mutationFn: async (payload) => {
      const title = payload?.unit_title || unitTitle;
      setGeneratingUnit(workspaceId, title, true);
      return learningPathApi.generateLearningUnitContent(workspaceId, {
        unit_title: title,
        unit_description: payload?.unit_description || '',
        learning_objectives: payload?.learning_objectives || [],
        tags: payload?.tags || [],
      });
    },
    onSuccess: (data, variables) => {
      const title = variables?.unit_title || unitTitle;
      setGeneratingUnit(workspaceId, title, false);
      queryClient.invalidateQueries({
        queryKey: [LEARNING_UNIT_QUERY_KEY, workspaceId, title],
      });
      queryClient.invalidateQueries({
        queryKey: [LEARNING_PATH_QUERY_KEY, workspaceId],
      });
    },
    onError: (err, variables) => {
      const title = variables?.unit_title || unitTitle;
      setGeneratingUnit(workspaceId, title, false);
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [LEARNING_UNIT_QUERY_KEY, workspaceId, unitTitle],
      });
    },
  });
}
