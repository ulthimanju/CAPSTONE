/**
 * ChatSection — Structural Layout Layer
 *
 * Provides a clean interactive interface for asking questions and viewing
 * grounded RAG AI responses.
 */

import React from 'react';
import { Button } from '@/components/ui/Button';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { Send, Bot, Sparkles, User } from 'lucide-react';

export function ChatSectionLayout({
  workspaceId,
  question,
  setQuestion,
  chatResponse,
  isLoading,
  error,
  onSendQuestion,
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (question.trim() && !isLoading) {
        onSendQuestion();
      }
    }
  };

  const answer = chatResponse?.answer || (typeof chatResponse === 'string' ? chatResponse : null);
  const askedQuestion = chatResponse?.question;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', width: '100%' }}>
      {/* Input box */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
        }}
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your workspace documents..."
          rows={3}
          style={{
            width: '100%',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--bg)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-body)',
            resize: 'vertical',
            outline: 'none',
            lineHeight: 'var(--leading-relaxed)',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={onSendQuestion}
            loading={isLoading}
            disabled={!question.trim()}
          >
            <Send size={14} style={{ marginRight: '6px' }} />
            Ask RAG AI
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--error-subtle)',
            color: 'var(--error-text)',
            border: '1px solid var(--error)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <strong>Error:</strong> {typeof error === 'object' ? JSON.stringify(error) : error}
        </div>
      )}

      {/* Loading state indicator */}
      {isLoading && (
        <div
          style={{
            padding: 'var(--space-8)',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--weight-semibold)',
              color: 'var(--text)',
              marginBottom: 'var(--space-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <Sparkles size={18} color="var(--accent)" />
            Searching workspace knowledge and generating response...
          </div>
        </div>
      )}

      {/* RAG Chat Response */}
      {chatResponse && !isLoading && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          {askedQuestion && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                paddingBottom: 'var(--space-3)',
                borderBottom: '1px solid var(--line-soft)',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-raised)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                <User size={16} />
              </div>
              <div
                style={{
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--weight-semibold)',
                  color: 'var(--text)',
                  lineHeight: 'var(--leading-snug)',
                  paddingTop: '2px',
                }}
              >
                {askedQuestion}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <Bot size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0, lineHeight: 'var(--leading-relaxed)' }}>
              {answer ? (
                <MarkdownRenderer content={answer} />
              ) : (
                <pre
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {JSON.stringify(chatResponse, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
