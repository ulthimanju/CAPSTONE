/**
 * Canonical Query Key Factory for Chat & Clarify Doubts Conversations
 */
export const chatKeys = {
  all: ['workspace-chat'],
  workspaces: () => [...chatKeys.all, 'workspace'],
  workspace: (workspaceId) => [...chatKeys.all, workspaceId],
};

export default chatKeys;
