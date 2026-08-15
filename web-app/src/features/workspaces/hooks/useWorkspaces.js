import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../api/workspaceApi';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const workspaceKeys = {
  all: ['workspaces'],
  lists: () => [...workspaceKeys.all, 'list'],
  list: (filters) => [...workspaceKeys.lists(), filters],
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
    staleTime: 1000 * 60 * 2, // 2 minutes
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
    staleTime: 1000 * 60 * 2,
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
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
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
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
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
 * Mutation hook to delete a workspace.
 */
export function useDeleteWorkspaceMutation(options = {}) {
  const queryClient = useQueryClient();
  const clearActiveWorkspace = useWorkspaceStore((state) => state.clearActiveWorkspace);

  return useMutation({
    mutationFn: (workspaceId) => workspaceApi.deleteWorkspace(workspaceId),
    onSuccess: (data, workspaceId, context) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
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
