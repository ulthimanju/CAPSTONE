import { useQuery } from '@tanstack/react-query';
import { workspaceApi } from '../api/workspaceApi';

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
