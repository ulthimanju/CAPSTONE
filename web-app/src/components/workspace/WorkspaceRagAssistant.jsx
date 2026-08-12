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
      description: `Upload Documents (PDF, DOCX, WPS), Slides, Spreadsheets, or Images to ${workspaceName || 'this workspace'} to start asking questions grounded in your content.`,
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
        padding: 'var(--space-8) var(--space-6)',
        animation: 'fadeIn var(--motion-normal) ease-out',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          color: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'var(--font-size-2xl)',
          marginBottom: 'var(--space-4)',
          flexShrink: 0,
        }}
      >
        <i className={`ti ${cfg.icon}`} style={cfg.showProcessing ? { animation: 'spin 1.2s linear infinite', display: 'inline-block' } : {}} />
      </div>

      {/* Heading */}
      <h4
        style={{
          fontSize: 'var(--font-size-base)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          margin: '0 0 var(--space-1-5)',
        }}
      >
        {cfg.heading}
      </h4>

      {/* Description */}
      <p
        style={{
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-text-disabled)',
          maxWidth: '380px',
          lineHeight: '1.55',
          margin: '0 0 var(--space-6)',
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
            gap: 'var(--space-2)',
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
        background: hovered ? 'var(--color-bg-elevated)' : 'var(--color-bg-secondary)',
        border: `1px solid ${hovered ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
        borderRadius: 'var(--radius-full)',
        padding: 'var(--space-1-5) var(--space-3)',
        fontSize: 'var(--font-size-xs)',
        color: hovered ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-1-5)',
        transition: `all var(--motion-fast) ease`,
        lineHeight: '1.3',
        textAlign: 'left',
      }}
    >
      <i className="ti ti-bulb" style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
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
        animation: 'fadeIn var(--motion-normal) ease-out',
      }}
    >
      <div
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-disabled)',
          marginBottom: 'var(--space-1)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        <span style={{ fontWeight: 'var(--font-weight-semibold)', color: isUser ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
          {isUser ? 'You' : 'Assistant'}
        </span>
        <span>·</span>
        <span>{msg.timestamp}</span>
      </div>

      <div
        style={{
          background: isUser ? 'var(--color-primary-subtle)' : 'var(--color-bg-secondary)',
          border: `1px solid ${isUser ? 'var(--color-primary-alpha-20)' : 'var(--color-border-default)'}`,
          borderRadius: isUser ? 'var(--radius-xl) var(--radius-xl) var(--radius-xs) var(--radius-xl)' : 'var(--radius-xl) var(--radius-xl) var(--radius-xl) var(--radius-xs)',
          padding: 'var(--space-3) var(--space-4)',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-md)',
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
    } catch (error) {
      const displayMsg =
        error?.message && error.message !== 'An API error occurred'
          ? error.message
          : 'I can only answer questions related to the documents in this workspace. Please ask a question about the uploaded content.';

      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: displayMsg,
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
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2-5)' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--font-size-base)',
              flexShrink: 0,
            }}
          >
            <i className="ti ti-message-bot" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
              RAG Assistant
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)', lineHeight: 1.2, marginTop: '1px' }}>
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
            style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-1) var(--space-2-5)', gap: 'var(--space-1)', color: 'var(--color-text-secondary)' }}
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
          padding: hasConversation ? 'var(--space-4)' : '0',
          gap: hasConversation ? 'var(--space-3-5)' : '0',
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
                  gap: 'var(--space-2)',
                  alignSelf: 'flex-start',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--radius-xl) var(--radius-xl) var(--radius-xl) var(--radius-xs)',
                  padding: 'var(--space-2-5) var(--space-3-5)',
                  animation: 'fadeIn var(--motion-normal) ease-out',
                }}
              >
                <Spinner size="sm" />
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Searching documents…</span>
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
          padding: 'var(--space-3) var(--space-3-5)',
          borderTop: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-secondary)',
          display: 'flex',
          gap: 'var(--space-2-5)',
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
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-3)',
            fontSize: 'var(--font-size-md)',
            color: 'var(--color-text-primary)',
            outline: 'none',
            resize: 'none',
            lineHeight: '1.5',
            fontFamily: 'inherit',
            overflow: 'hidden',
            transition: `border-color var(--motion-fast) ease`,
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-default)')}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!canSend || !inputQuery.trim()}
          title="Send (Enter)"
          style={{
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--font-size-md)',
            gap: 'var(--space-1-5)',
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
