import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../api/workspaceApi';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { workspaceKeys } from './workspaceKeys';

export { workspaceKeys };

/**
 * Hook to fetch paginated workspaces for the current user.
 */
export function useWorkspacesQuery({ limit = 50, offset = 0 } = {}, options = {}) {
  return useQuery({
    queryKey: workspaceKeys.list({ limit, offset }),
    queryFn: () => workspaceApi.getWorkspaces({ limit, offset }),
    staleTime: 1000 * 10, // 10 seconds
    ...options,
  });
}

/**
 * Hook to fetch archived workspaces for the current user.
 */
export function useArchivedWorkspacesQuery({ limit = 50, offset = 0 } = {}, options = {}) {
  return useQuery({
    queryKey: workspaceKeys.archived({ limit, offset }),
    queryFn: () => workspaceApi.getArchivedWorkspaces({ limit, offset }),
    staleTime: 1000 * 10,
    ...options,
  });
}

/**
 * Hook to fetch a single workspace by ID.
 */
export function useWorkspaceQuery(workspaceId, options = {}) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => workspaceApi.getWorkspaceById(workspaceId),
    enabled: !!workspaceId,
    staleTime: 1000 * 10,
    ...options,
  });
}

/**
 * Hook to query authoritative active generation job statuses from backend.
 * Polling interval activates only when any job is actively in-flight ('RUNNING' / 'QUEUED').
 */
export function useWorkspaceGenerationStatusQuery(workspaceId, options = {}) {
  return useQuery({
    queryKey: workspaceKeys.generationStatus(workspaceId),
    queryFn: () => workspaceApi.getWorkspaceGenerationStatus(workspaceId),
    enabled: Boolean(workspaceId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const isAnyActive =
        data.summary_status === 'RUNNING' ||
        data.summary_status === 'QUEUED' ||
        data.learning_path_status === 'RUNNING' ||
        data.learning_path_status === 'QUEUED' ||
        (data.unit_statuses && Object.values(data.unit_statuses).some((s) => s === 'RUNNING' || s === 'QUEUED'));
      return isAnyActive ? 2500 : false;
    },
    staleTime: 0,
    ...options,
  });
}

/**
 * Mutation hook to create a new workspace.
 */
export function useCreateWorkspaceMutation(options = {}) {
  const queryClient = useQueryClient();
  const setActiveWorkspaceId = useWorkspaceStore((state) => state.setActiveWorkspaceId);

  return useMutation({
    mutationFn: (newWorkspace) => workspaceApi.createWorkspace(newWorkspace),
    onSuccess: (data, variables, context) => {
      if (data?.id) {
        setActiveWorkspaceId(data.id);
        queryClient.setQueriesData({ queryKey: workspaceKeys.lists() }, (old) => {
          if (!old) return old;
          const currentList = Array.isArray(old.workspaces) ? old.workspaces : [];
          if (currentList.some((w) => w.id === data.id)) return old;
          return {
            ...old,
            workspaces: [data, ...currentList],
            total: (old.total || currentList.length) + 1,
          };
        });
      }
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Mutation hook to update an existing workspace.
 */
export function useUpdateWorkspaceMutation(workspaceId, options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => workspaceApi.updateWorkspace(workspaceId, data),
    onSuccess: (data, variables, context) => {
      if (data) {
        queryClient.setQueryData(workspaceKeys.detail(workspaceId), data);
        queryClient.setQueriesData({ queryKey: workspaceKeys.lists() }, (old) => {
          if (!old) return old;
          const currentList = Array.isArray(old.workspaces) ? old.workspaces : [];
          return {
            ...old,
            workspaces: currentList.map((w) => (w.id === workspaceId ? { ...w, ...data } : w)),
          };
        });
      }
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Mutation hook to archive a workspace.
 */
export function useArchiveWorkspaceMutation(options = {}) {
  const queryClient = useQueryClient();
  const clearActiveWorkspace = useWorkspaceStore((state) => state.clearActiveWorkspace);

  return useMutation({
    mutationFn: (workspaceId) => workspaceApi.archiveWorkspace(workspaceId),
    onSuccess: (data, workspaceId, context) => {
      queryClient.setQueriesData({ queryKey: workspaceKeys.lists() }, (old) => {
        if (!old) return old;
        const currentList = Array.isArray(old.workspaces) ? old.workspaces : [];
        return {
          ...old,
          workspaces: currentList.filter((w) => w.id !== workspaceId),
          total: Math.max(0, (old.total || currentList.length) - 1),
        };
      });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.archived() });
      clearActiveWorkspace();
      options.onSuccess?.(data, workspaceId, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Mutation hook to restore an archived workspace.
 */
export function useRestoreWorkspaceMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId) => workspaceApi.restoreWorkspace(workspaceId),
    onSuccess: (data, workspaceId, context) => {
      queryClient.setQueriesData({ queryKey: workspaceKeys.archived() }, (old) => {
        if (!old) return old;
        const currentList = Array.isArray(old.workspaces) ? old.workspaces : [];
        return {
          ...old,
          workspaces: currentList.filter((w) => w.id !== workspaceId),
          total: Math.max(0, (old.total || currentList.length) - 1),
        };
      });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.archived() });
      options.onSuccess?.(data, workspaceId, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Mutation hook to delete a workspace.
 */
export function useDeleteWorkspaceMutation(options = {}) {
  const queryClient = useQueryClient();
  const clearActiveWorkspace = useWorkspaceStore((state) => state.clearActiveWorkspace);

  return useMutation({
    mutationFn: (workspaceId) => workspaceApi.deleteWorkspace(workspaceId),
    onSuccess: (data, workspaceId, context) => {
      queryClient.removeQueries({ queryKey: workspaceKeys.detail(workspaceId) });
      queryClient.setQueriesData({ queryKey: workspaceKeys.lists() }, (old) => {
        if (!old) return old;
        const currentList = Array.isArray(old.workspaces) ? old.workspaces : [];
        return {
          ...old,
          workspaces: currentList.filter((w) => w.id !== workspaceId),
          total: Math.max(0, (old.total || currentList.length) - 1),
        };
      });
      queryClient.setQueriesData({ queryKey: workspaceKeys.archived() }, (old) => {
        if (!old) return old;
        const currentList = Array.isArray(old.workspaces) ? old.workspaces : [];
        return {
          ...old,
          workspaces: currentList.filter((w) => w.id !== workspaceId),
          total: Math.max(0, (old.total || currentList.length) - 1),
        };
      });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.archived() });
      clearActiveWorkspace();
      options.onSuccess?.(data, workspaceId, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Hook for real-time workspace name availability checking.
 */
export function useWorkspaceNameAvailability(name, excludeWorkspaceId = null) {
  const trimmed = (name || '').trim();

  return useQuery({
    queryKey: ['workspaces', 'check-name', trimmed, excludeWorkspaceId],
    queryFn: () => workspaceApi.checkNameAvailability(trimmed, excludeWorkspaceId),
    enabled: trimmed.length > 0,
    staleTime: 1000 * 5,
    retry: false,
  });
}
