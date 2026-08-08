import React, { useState, useRef, useEffect, useMemo } from 'react';
import { apiClient } from '../../services/api/client';
import { Spinner } from '../ui/Spinner';
import { RichMarkdownRenderer } from '../ui/RichMarkdownRenderer';
import { useAuth } from '../../hooks/useAuth';

/* ─── Derive document states ─────────────────────────────────── */
const READY_STATUSES = ['READY_FOR_RAG', 'INDEXED'];
const PROCESSING_STATUSES = ['UPLOADING', 'PARSING', 'CHUNKING', 'EMBEDDING'];

function useDocumentState(documents) {
  return useMemo(() => {
    if (!documents || documents.length === 0) return 'empty';
    const hasReady = documents.some((d) => READY_STATUSES.includes(d.status));
    if (hasReady) return 'ready';
    const hasProcessing = documents.some((d) => PROCESSING_STATUSES.includes(d.status));
    if (hasProcessing) return 'processing';
    return 'empty';
  }, [documents]);
}

/* ─── Adaptive prompts derived from document names ──────────── */
function useAdaptivePrompts(documents, workspaceName) {
  return useMemo(() => {
    const readyDocs = (documents || []).filter((d) => READY_STATUSES.includes(d.status));
    if (readyDocs.length === 0) return [];

    // Extract meaningful keywords from filenames
    const docNames = readyDocs
      .slice(0, 3)
      .map((d) => (d.original_filename || d.filename || '').replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
      .filter(Boolean);

    const firstName = docNames[0];
    const wName = workspaceName || 'this workspace';

    if (docNames.length === 1) {
      return [
        `Summarise the key points in "${firstName}"`,
        `What are the main conclusions of "${firstName}"?`,
        `List any requirements or constraints mentioned in "${firstName}"`,
        `What methodology or approach is described in "${firstName}"?`,
      ];
    }

    return [
      `What are the main topics covered across ${wName}?`,
      `Compare the methodologies described in these documents`,
      `Summarise the key findings and conclusions`,
      `List all requirements and constraints mentioned`,
    ];
  }, [documents, workspaceName]);
}

/* ─── Empty-state panel (before conversation starts) ────────── */
const EmptyState = ({ docState, adaptivePrompts, onPromptClick, workspaceName }) => {
  const stateConfig = {
    empty: {
      icon: 'ti-upload',
      heading: 'What can I help you find?',
      description: `Upload PDF, Word, or text documents to ${workspaceName || 'this workspace'} to start asking questions grounded in your content.`,
      showPrompts: false,
      showProcessing: false,
    },
    processing: {
      icon: 'ti-loader-2',
      heading: 'What can I help you find?',
      description: 'Your documents are being indexed. AI-grounded Q&A will be available once processing completes — usually within a minute.',
      showPrompts: false,
      showProcessing: true,
    },
    ready: {
      icon: 'ti-sparkles',
      heading: 'What can I help you find?',
      description: `Ask anything about your ${workspaceName || 'workspace'} documents. Answers are grounded in your content.`,
      showPrompts: true,
      showProcessing: false,
    },
  };

  const cfg = stateConfig[docState] || stateConfig.empty;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        textAlign: 'center',
        padding: '2rem 1.5rem',
        animation: 'fadeIn var(--transition-normal) ease-out',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'var(--bg-3)',
          border: '1px solid var(--border)',
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          marginBottom: '1rem',
          flexShrink: 0,
        }}
      >
        <i className={`ti ${cfg.icon}`} style={cfg.showProcessing ? { animation: 'spin 1.2s linear infinite' } : {}} />
      </div>

      {/* Heading */}
      <h4
        style={{
          fontSize: '15px',
          fontWeight: '600',
          color: 'var(--text)',
          margin: '0 0 0.4rem',
        }}
      >
        {cfg.heading}
      </h4>

      {/* Description */}
      <p
        style={{
          fontSize: '13px',
          color: 'var(--text-3)',
          maxWidth: '380px',
          lineHeight: '1.55',
          margin: '0 0 1.5rem',
        }}
      >
        {cfg.description}
      </p>

      {/* Adaptive suggested prompts */}
      {cfg.showPrompts && adaptivePrompts.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            maxWidth: '560px',
          }}
        >
          {adaptivePrompts.map((prompt, idx) => (
            <PromptChip key={idx} text={prompt} onClick={() => onPromptClick(prompt)} />
          ))}
        </div>
      )}
    </div>
  );
};

const PromptChip = ({ text, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--bg-3)' : 'var(--bg-2)',
        border: `1px solid ${hovered ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '20px',
        padding: '7px 13px',
        fontSize: '12px',
        color: hovered ? 'var(--text)' : 'var(--text-2)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: `all var(--transition-fast) ease`,
        lineHeight: '1.3',
        textAlign: 'left',
      }}
    >
      <i className="ti ti-bulb" style={{ color: 'var(--accent)', flexShrink: 0 }} />
      {text}
    </button>
  );
};

/* ─── Message bubble ─────────────────────────────────────────── */
const MessageBubble = ({ msg }) => {
  const isUser = msg.sender === 'user';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        animation: 'fadeIn var(--transition-normal) ease-out',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: 'var(--text-faint)',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        <span style={{ fontWeight: '600', color: isUser ? 'var(--accent)' : 'var(--text-dim)' }}>
          {isUser ? 'You' : 'Assistant'}
        </span>
        <span>·</span>
        <span>{msg.timestamp}</span>
      </div>

      <div
        style={{
          background: isUser ? 'var(--accent-bg)' : 'var(--bg-2)',
          border: `1px solid ${isUser ? 'rgba(77,124,245,0.2)' : 'var(--border-strong)'}`,
          borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
          padding: '12px 16px',
          color: 'var(--text)',
          fontSize: '13.5px',
          lineHeight: '1.6',
        }}
      >
        {isUser ? (
          <div>{msg.text}</div>
        ) : (
          <RichMarkdownRenderer content={msg.text} />
        )}
      </div>
    </div>
  );
};

/* ─── Main component ─────────────────────────────────────────── */
export const WorkspaceRagAssistant = ({ workspaceId, documents = [], workspaceName }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const docState = useDocumentState(documents);
  const adaptivePrompts = useAdaptivePrompts(documents, workspaceName);
  const hasConversation = messages.length > 0;
  const canSend = docState === 'ready' && !loading;

  /* Auto-scroll */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* Load chat history */
  useEffect(() => {
    if (!workspaceId) return;
    const load = async () => {
      try {
        const headers = user?.id ? { 'X-User-ID': user.id } : {};
        const res = await apiClient.get(`/api/v1/workspaces/${workspaceId}/chat`, { headers });
        if (res.data && Array.isArray(res.data.messages)) {
          setMessages(res.data.messages);
        }
      } catch {
        /* silent — no history yet */
      }
    };
    load();
  }, [workspaceId]);

  /* Reset on workspace change */
  useEffect(() => {
    setMessages([]);
    setInputQuery('');
  }, [workspaceId]);

  const saveChatHistory = async (msgs) => {
    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await apiClient.put(`/api/v1/workspaces/${workspaceId}/chat`, { messages: msgs }, { headers });
    } catch {
      /* silent */
    }
  };

  const handleSend = async (queryToSend) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || !canSend) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const withUser = [...messages, userMsg];
    setMessages(withUser);
    if (!queryToSend) setInputQuery('');
    setLoading(true);

    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await apiClient.post(
        '/api/v1/rag/chat',
        { workspace_id: workspaceId, question: text, top_k: 5 },
        { headers }
      );

      const assistantMsg = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: res.data.answer || 'No answer generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const final = [...withUser, assistantMsg];
      setMessages(final);
      await saveChatHistory(final);
    } catch {
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'Unable to retrieve an answer. Please try again or check that your documents have finished processing.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const final = [...withUser, errorMsg];
      setMessages(final);
      await saveChatHistory(final);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleClearChat = async () => {
    setMessages([]);
    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await apiClient.delete(`/api/v1/workspaces/${workspaceId}/chat`, { headers });
    } catch {
      /* silent */
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* Placeholder text derived from state */
  const inputPlaceholder = {
    empty: 'Upload documents to enable Q&A…',
    processing: 'Waiting for documents to finish indexing…',
    ready: 'Ask a question about your documents…',
  }[docState];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)',
        minHeight: '480px',
        background: 'var(--bg-1)',
        border: '1px solid var(--border-strong)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              flexShrink: 0,
            }}
          >
            <i className="ti ti-message-bot" />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text)', lineHeight: 1.2 }}>
              RAG Assistant
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)', lineHeight: 1.2, marginTop: '1px' }}>
              {docState === 'ready'
                ? `${documents.filter((d) => READY_STATUSES.includes(d.status)).length} document${
                    documents.filter((d) => READY_STATUSES.includes(d.status)).length !== 1 ? 's' : ''
                  } indexed`
                : docState === 'processing'
                ? 'Indexing documents…'
                : 'No documents indexed'}
            </div>
          </div>
        </div>

        {hasConversation && (
          <button
            className="btn"
            style={{ fontSize: '12px', padding: '4px 10px', gap: '5px', color: 'var(--text-dim)' }}
            onClick={handleClearChat}
            title="Clear conversation"
          >
            <i className="ti ti-trash" />
            Clear
          </button>
        )}
      </div>

      {/* ── Messages / Empty State ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: hasConversation ? '16px' : '0',
          gap: hasConversation ? '14px' : '0',
        }}
      >
        {!hasConversation ? (
          <EmptyState
            docState={docState}
            adaptivePrompts={adaptivePrompts}
            workspaceName={workspaceName}
            onPromptClick={(p) => handleSend(p)}
          />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {/* Thinking indicator */}
            {loading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  alignSelf: 'flex-start',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '12px 12px 12px 2px',
                  padding: '10px 14px',
                  animation: 'fadeIn var(--transition-normal) ease-out',
                }}
              >
                <Spinner size="sm" />
                <span style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>Searching documents…</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* ── Composer ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-2)',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-end',
          flexShrink: 0,
        }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={inputQuery}
          onChange={(e) => {
            setInputQuery(e.target.value);
            /* auto-grow up to ~4 lines */
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
          }}
          onKeyDown={handleKeyDown}
          placeholder={inputPlaceholder}
          disabled={!canSend}
          style={{
            flex: 1,
            background: 'var(--bg-1)',
            border: '1px solid var(--border-strong)',
            borderRadius: '8px',
            padding: '9px 12px',
            fontSize: '13px',
            color: 'var(--text)',
            outline: 'none',
            resize: 'none',
            lineHeight: '1.5',
            fontFamily: 'inherit',
            overflow: 'hidden',
            transition: `border-color var(--transition-fast) ease`,
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!canSend || !inputQuery.trim()}
          title="Send (Enter)"
          style={{
            padding: '9px 16px',
            fontSize: '13px',
            gap: '6px',
            flexShrink: 0,
            alignSelf: 'flex-end',
          }}
        >
          <i className="ti ti-send" />
          Send
        </button>
      </form>
    </div>
  );
};
