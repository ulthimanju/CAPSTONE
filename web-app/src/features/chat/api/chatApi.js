import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

/**
 * Streams tokens from the RAG chat SSE endpoint in real time.
 */
export async function sendRAGChatMessageStream({
  workspaceId,
  question,
  topK = 5,
  workspaceCodeLanguage = null,
  domainType = null,
  onCitations,
  onChunk,
}) {
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

  const token = useAuthStore.getState().token || localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${baseURL}/api/v1/rag/chat/stream`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errDetail = 'Failed to stream response from AI Tutor.';
    try {
      const errJson = await response.json();
      errDetail = errJson.detail || errJson.error || errDetail;
    } catch {}
    throw new Error(errDetail);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';
  let citations = [];
  let finalPayload = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const block of lines) {
      if (!block.trim()) continue;
      const eventMatch = /^event:\s*(\w+)/m.exec(block);
      const dataMatch = /^data:\s*([\s\S]+)$/m.exec(block);

      const eventType = eventMatch ? eventMatch[1] : 'message';
      const rawData = dataMatch ? dataMatch[1] : '';

      if (eventType === 'citations') {
        try {
          citations = JSON.parse(rawData);
          if (onCitations) onCitations(citations);
        } catch {}
      } else if (eventType === 'done') {
        try {
          finalPayload = JSON.parse(rawData);
        } catch {
          finalPayload = { sections: [{ id: 'sec-1', title: '', content: fullText }] };
        }
      } else if (eventType === 'error') {
        try {
          const errObj = JSON.parse(rawData);
          throw new Error(errObj.error || errObj.detail || 'Streaming error');
        } catch (e) {
          throw new Error(rawData || e.message);
        }
      } else {
        fullText += rawData;
        if (onChunk) onChunk(rawData, fullText);
      }
    }
  }

  return {
    answer: finalPayload || { sections: [{ id: 'sec-1', title: '', content: fullText }] },
    citations,
  };
}
