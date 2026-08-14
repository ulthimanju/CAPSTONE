/**
 * ChatSection — Structural Layout Layer
 *
 * Renders question input controls and displays the raw received JSON payload
 * for RAG Chat and Semantic Search responses.
 */

import React from 'react';
import { Button } from '@/components/ui/Button';

export function ChatSectionLayout({
  workspaceId,
  question,
  setQuestion,
  chatResponse,
  searchResults,
  isLoading,
  error,
  onSendQuestion,
  onSemanticSearch,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Input box */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
        }}
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about the workspace documents or perform semantic search..."
          rows={3}
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--bg)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text)',
            fontSize: '14px',
            fontFamily: 'var(--font-body)',
            resize: 'vertical',
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={onSemanticSearch}
            loading={isLoading}
            disabled={!question.trim()}
          >
            Semantic Search Only
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSendQuestion}
            loading={isLoading}
            disabled={!question.trim()}
          >
            Ask RAG AI
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--error-subtle)',
            color: 'var(--error-text)',
            border: '1px solid var(--error)',
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <strong>Error:</strong> {typeof error === 'object' ? JSON.stringify(error) : error}
        </div>
      )}

      {/* RAG Chat Response Payload */}
      {chatResponse && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            overflowX: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              borderBottom: '1px solid var(--line-soft)',
              paddingBottom: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              RAG Chat API Response Payload
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {`${JSON.stringify(chatResponse).length} bytes`}
            </span>
          </div>

          <pre
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              lineHeight: '1.5',
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {JSON.stringify(chatResponse, null, 2)}
          </pre>
        </div>
      )}

      {/* Semantic Search Response Payload */}
      {searchResults && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            overflowX: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              borderBottom: '1px solid var(--line-soft)',
              paddingBottom: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--ok)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Semantic Search API Response Payload
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {`${JSON.stringify(searchResults).length} bytes`}
            </span>
          </div>

          <pre
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              lineHeight: '1.5',
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {JSON.stringify(searchResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
