import api from '@/lib/api';

/**
 * Fetch persistent chat history for a workspace.
 */
export async function fetchWorkspaceChat(workspaceId) {
  const res = await api.get(`/api/v1/workspaces/${workspaceId}/chat`);
  return res.data;
}

/**
 * Save persistent chat history for a workspace.
 */
export async function saveWorkspaceChat(workspaceId, messages) {
  const res = await api.put(`/api/v1/workspaces/${workspaceId}/chat`, { messages });
  return res.data;
}

/**
 * Send a question to RAG chat endpoint and receive answer with source citations.
 */
export async function sendRAGChatMessage(workspaceId, question, topK = 5) {
  const res = await api.post('/api/v1/rag/chat', {
    workspace_id: workspaceId,
    question,
    top_k: topK,
  });
  return res.data;
}
