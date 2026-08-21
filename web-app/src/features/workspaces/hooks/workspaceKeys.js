/**
 * Canonical Query Key Factory for Workspaces
 */
export const workspaceKeys = {
  all: ['workspaces'],
  lists: () => [...workspaceKeys.all, 'list'],
  list: (filters) => [...workspaceKeys.lists(), filters],
  details: () => [...workspaceKeys.all, 'detail'],
  detail: (id) => [...workspaceKeys.details(), id],
  members: (id) => [...workspaceKeys.all, 'members', id],
  generationStatus: (id) => [...workspaceKeys.all, 'generation-status', id],
  archived: (filters) => (filters !== undefined ? [...workspaceKeys.all, 'archived', filters] : [...workspaceKeys.all, 'archived']),
};
