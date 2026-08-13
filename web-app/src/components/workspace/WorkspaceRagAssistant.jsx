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

  // Format time for bottom-right timestamp inside bubble (e.g., "08:14 AM")
  const formatTimeOnly = (t) => {
    if (!t) return '';
    const d = new Date(t);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const timeMatch = String(t).match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/i);
    return timeMatch ? timeMatch[0] : String(t);
  };

  const timeStr = formatTimeOnly(msg.createdAt || msg.timestamp || new Date());

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '65%',
        minWidth: '240px',
        animation: 'fadeIn var(--motion-normal) ease-out',
        marginBottom: 'var(--space-3)',
      }}
    >
      <div
        style={{
          background: isUser ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
          border: `1px solid ${isUser ? 'var(--color-primary)' : 'var(--color-border-default)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-4) var(--space-5)',
          color: isUser ? 'var(--color-primary-contrast, #ffffff)' : 'var(--color-text-primary)',
          fontSize: 'var(--font-size-md)',
          lineHeight: '1.6',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--elevation-xs)',
        }}
      >
        <div style={{ flex: 1, paddingBottom: 'var(--space-3)' }}>
          {isUser ? (
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</div>
          ) : (
            <RichMarkdownRenderer content={msg.text} />
          )}
        </div>

        {/* Bottom-Right Timestamp inside the bubble */}
        <div
          style={{
            alignSelf: 'flex-end',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: isUser ? 'rgba(255, 255, 255, 0.75)' : 'var(--color-text-muted)',
            marginTop: 'var(--space-1)',
          }}
        >
          {timeStr}
        </div>
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

    const now = new Date();
    const formattedTimestamp = now.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const isoDate = now.toISOString();

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: formattedTimestamp,
      createdAt: isoDate,
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
        timestamp: formattedTimestamp,
        createdAt: isoDate,
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
        timestamp: formattedTimestamp,
        createdAt: isoDate,
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

  const inputPlaceholder = {
    empty: 'Upload documents to start chat...',
    processing: 'Indexing documents… chat available shortly',
    ready: 'Type a message...',
  }[docState];

  // Derive date header for date divider
  const currentDateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flex: 1,
        minHeight: '560px',
        background: 'var(--color-bg-base)',
        position: 'relative',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: 'var(--space-6) var(--space-8)',
          borderBottom: '1px solid var(--color-border-subtle)',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.25rem',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            margin: 0,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          Research Field Chat
        </h1>

        <button
          className="btn btn-secondary"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-default)',
            background: 'var(--color-bg-surface)',
          }}
          onClick={handleClearChat}
        >
          Clear Chat
        </button>
      </div>

      {/* ── Messages / Empty State ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: hasConversation ? 'var(--space-6) var(--space-8)' : '0',
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
            {/* Centered Date Divider Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 'var(--space-4) 0 var(--space-6) 0',
                position: 'relative',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border-subtle)' }} />
              <span
                style={{
                  padding: '0 var(--space-4)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {currentDateStr}
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border-subtle)' }} />
            </div>

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
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3) var(--space-4)',
                  animation: 'fadeIn var(--motion-normal) ease-out',
                  marginBottom: 'var(--space-3)',
                }}
              >
                <Spinner size="sm" />
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>Thinking…</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* ── Composer Footer ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          padding: 'var(--space-5) var(--space-8)',
          borderTop: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-secondary)',
          display: 'flex',
          gap: 'var(--space-4)',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={inputQuery}
          onChange={(e) => {
            setInputQuery(e.target.value);
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
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-3) var(--space-4)',
            fontSize: 'var(--font-size-md)',
            color: 'var(--color-text-primary)',
            outline: 'none',
            resize: 'none',
            lineHeight: '1.5',
            fontFamily: 'inherit',
            transition: 'border-color var(--motion-fast) ease',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-default)')}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!canSend || !inputQuery.trim()}
          style={{
            padding: 'var(--space-3) var(--space-7)',
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-medium)',
            borderRadius: 'var(--radius-sm)',
            minWidth: '90px',
          }}
        >
          {loading ? <Spinner size="sm" /> : 'Send'}
        </button>
      </form>
    </div>
  );
};
