/**
 * Canonical Query Key Factory for Documents
 */
export const documentKeys = {
  all: ['documents'],
  lists: () => [...documentKeys.all, 'list'],
  list: (filters) => [...documentKeys.lists(), filters],
  workspaceList: (workspaceId) => [...documentKeys.all, 'workspace', workspaceId],
  details: () => [...documentKeys.all, 'detail'],
  detail: (documentId) => [...documentKeys.details(), documentId],
  parseResults: () => [...documentKeys.all, 'parse-result'],
  parseResult: (documentId) => [...documentKeys.parseResults(), documentId],
};

export const DOCUMENT_QUERY_KEYS = documentKeys;
