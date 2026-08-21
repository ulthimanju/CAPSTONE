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
 *
 * Per-request timeout of 120s: the RAG pipeline involves embedding the query via
 * gRPC, pgvector similarity search, and LLM generation — this can take 20-60s.
 * The global axios timeout of 30s would fire before the backend responds, so we
 * override it here specifically for this endpoint.
 */
export async function sendRAGChatMessage(workspaceId, question, topK = 5, workspaceCodeLanguage = null, domainType = null) {
  const payload = {
    workspace_id: workspaceId,
    question,
    top_k: topK,
  };
  if (workspaceCodeLanguage) {
    payload.workspace_code_language = workspaceCodeLanguage;
  }
  if (domainType) {
    payload.domain_type = domainType;
  }

  const res = await api.post(
    '/api/v1/rag/chat',
    payload,
    { timeout: 120000 }
  );
  return res.data;
}
