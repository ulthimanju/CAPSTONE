import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Spinner } from '../ui/Spinner';
import { RichMarkdownRenderer } from '../ui/RichMarkdownRenderer';
import { useAuth } from '../../hooks/useAuth';

export const WorkspaceRagAssistant = ({ workspaceId, documents = [] }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryToSend) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || loading || documents.length === 0) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryToSend) setInputQuery('');
    setLoading(true);

    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await axios.post(
        '/api/v1/rag/chat',
        {
          workspace_id: workspaceId,
          question: text,
          top_k: 5,
        },
        { headers }
      );

      const assistantMsg = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: res.data.answer || 'No answer generated.',
        citations: res.data.citations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('RAG Assistant error:', err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: '❌ Failed to query RAG Assistant. Please check if your workspace has processed documents.',
        citations: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const suggestedPrompts = [
    'Summarize the core concepts across all documents',
    'What are the primary methodologies discussed?',
    'List the key requirements and constraints',
    'What are the main advantages and drawbacks mentioned?',
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 220px)',
        minHeight: '520px',
        background: 'var(--bg-1)',
        border: '1px solid var(--border-strong)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* ---------- HEADER ---------- */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-2)',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              fontSize: '18px',
            }}
          >
            <i className="ti ti-message-bot"></i>
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', margin: 0 }}>
              RAG Workspace Assistant
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              Grounded QA powered by vector search & Gemini AI
            </span>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            className="btn"
            style={{ fontSize: '12px', padding: '5px 12px', gap: '6px', color: 'var(--text-3)' }}
            onClick={handleClearChat}
          >
            <i className="ti ti-trash"></i> Clear Chat
          </button>
        )}
      </div>

      {/* ---------- MESSAGES VIEWPORT ---------- */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justify: 'center',
              height: '100%',
              textAlign: 'center',
              padding: '2rem 1rem',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border-strong)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                fontSize: '26px',
                marginBottom: '1rem',
              }}
            >
              <i className="ti ti-sparkles"></i>
            </div>

            <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '0.4rem' }}>
              Ask your Workspace Documents
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: '420px', marginBottom: '1.75rem', lineHeight: '1.5' }}>
              {documents.length === 0
                ? 'Upload PDF, Word, or text documents to this workspace to enable AI-grounded Q&A.'
                : 'Queries are executed against vector embeddings of your workspace files for precise, accurate citations.'}
            </p>

            {documents.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '600px' }}>
                {suggestedPrompts.map((promptText, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(promptText)}
                    style={{
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '20px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      color: 'var(--text-2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.color = 'var(--text)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-2)';
                    }}
                  >
                    <i className="ti ti-bulb" style={{ color: 'var(--accent)' }}></i> {promptText}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                {/* Header info */}
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-3)',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <span style={{ fontWeight: '600', color: isUser ? 'var(--accent)' : 'var(--text-2)' }}>
                    {isUser ? 'You' : 'RAG Assistant'}
                  </span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Bubble */}
                <div
                  style={{
                    background: isUser ? 'var(--bg-2)' : 'var(--bg-2)',
                    border: isUser ? '1px solid var(--border-strong)' : '1px solid var(--border-strong)',
                    borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    padding: '16px 20px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
          })
        )}

        {/* Loading Indicator */}
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              alignSelf: 'flex-start',
              background: 'var(--bg-2)',
              border: '1px solid var(--border-strong)',
              borderRadius: '12px 12px 12px 2px',
              padding: '12px 18px',
            }}
          >
            <Spinner size="sm" />
            <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>
              Querying vector embeddings & synthesizing response...
            </span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ---------- INPUT BAR ---------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-2)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={
            documents.length === 0
              ? 'Upload documents to enable RAG Q&A...'
              : 'Ask a question about your workspace documents...'
          }
          disabled={documents.length === 0 || loading}
          style={{
            flex: 1,
            background: 'var(--bg-1)',
            border: '1px solid var(--border-strong)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            color: 'var(--text)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={documents.length === 0 || loading || !inputQuery.trim()}
          style={{ padding: '10px 20px', fontSize: '13px', gap: '6px' }}
        >
          <i className="ti ti-send"></i> Send
        </button>
      </form>
    </div>
  );
};
