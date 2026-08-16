import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../api/workspaceApi';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const workspaceKeys = {
  all: ['workspaces'],
  lists: () => [...workspaceKeys.all, 'list'],
  list: (filters) => [...workspaceKeys.lists(), filters],
  archived: (filters) => [...workspaceKeys.all, 'archived', filters],
  details: () => [...workspaceKeys.all, 'detail'],
  detail: (id) => [...workspaceKeys.details(), id],
};

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
 * Mutation hook to create a new workspace.
 */
export function useCreateWorkspaceMutation(options = {}) {
  const queryClient = useQueryClient();
  const setActiveWorkspaceId = useWorkspaceStore((state) => state.setActiveWorkspaceId);

  return useMutation({
    mutationFn: (newWorkspace) => workspaceApi.createWorkspace(newWorkspace),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      if (data?.id) {
        setActiveWorkspaceId(data.id);
      }
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
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
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
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
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
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
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
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      queryClient.removeQueries({ queryKey: workspaceKeys.detail(workspaceId) });
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
