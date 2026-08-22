/**
 * Canonical Query Key Factory for Chat & Clarify Doubts Conversations
 * Isolated per workspace and per authenticated user.
 */
export const chatKeys = {
  all: ['workspace-chat'],
  workspaces: () => [...chatKeys.all, 'workspace'],
  workspace: (workspaceId, userId = 'current') => [...chatKeys.all, workspaceId, userId || 'current'],
  workspaceUser: (workspaceId, userId) => [...chatKeys.all, workspaceId, userId || 'current'],
};

export default chatKeys;
