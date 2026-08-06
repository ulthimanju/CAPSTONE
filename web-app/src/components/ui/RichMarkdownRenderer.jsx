import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import mermaid from 'mermaid';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/atom-one-dark.css';

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

const MermaidDiagram = ({ code }) => {
  const containerRef = useRef(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    if (containerRef.current && code) {
      containerRef.current.innerHTML = '';
      mermaid
        .render(idRef.current, code)
        .then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        })
        .catch((err) => {
          console.error('Mermaid render error:', err);
          if (containerRef.current) {
            containerRef.current.innerHTML = `<pre style="color:var(--danger);font-size:12px;background:var(--bg-3);padding:8px;border-radius:6px;">${code}</pre>`;
          }
        });
    }
  }, [code]);

  return <div ref={containerRef} className="mermaid-diagram-container" style={{ margin: '1rem 0', textAlign: 'center' }} />;
};

export const RichMarkdownRenderer = ({ content, compact = false }) => {
  if (!content) return null;

  return (
    <div className="rich-markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (lang === 'mermaid') {
              return <MermaidDiagram code={codeString} />;
            }

            if (inline) {
              return (
                <code
                  style={{
                    background: 'var(--bg-3)',
                    color: 'var(--accent)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <pre
                style={{
                  background: '#1e1e2e',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  overflowX: 'auto',
                  margin: compact ? '4px 0' : '12px 0',
                  fontSize: '13px',
                }}
              >
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          table({ children }) {
            return (
              <div style={{ overflowX: 'auto', margin: compact ? '8px 0' : '16px 0' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                    textAlign: 'left',
                    background: 'var(--bg-1)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th
                style={{
                  padding: '10px 14px',
                  background: 'var(--bg-3)',
                  color: 'var(--text)',
                  fontWeight: '600',
                  borderBottom: '2px solid var(--border-strong)',
                }}
              >
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-2)',
                }}
              >
                {children}
              </td>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote
                style={{
                  borderLeft: '4px solid var(--accent)',
                  margin: compact ? '4px 0' : '12px 0',
                  paddingLeft: '16px',
                  color: 'var(--text-2)',
                  fontStyle: 'italic',
                  background: 'var(--bg-3)',
                  padding: '8px 16px',
                  borderRadius: '0 8px 8px 0',
                }}
              >
                {children}
              </blockquote>
            );
          },
          h1: ({ children }) => <h1 style={{ fontSize: '18px', fontWeight: '700', margin: compact ? '8px 0 4px 0' : '16px 0 8px 0', color: 'var(--text)' }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: '16px', fontWeight: '700', margin: compact ? '6px 0 3px 0' : '14px 0 6px 0', color: 'var(--text)' }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: '14px', fontWeight: '600', margin: compact ? '4px 0 2px 0' : '12px 0 4px 0', color: 'var(--text)' }}>{children}</h3>,
          p: ({ children }) => <p style={{ margin: compact ? '0' : '8px 0', lineHeight: compact ? '1.4' : '1.6', color: 'var(--text-2)' }}>{children}</p>,
          ul: ({ children }) => <ul style={{ paddingLeft: '20px', margin: compact ? '2px 0' : '8px 0' }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ paddingLeft: '20px', margin: compact ? '2px 0' : '8px 0' }}>{children}</ol>,
          li: ({ children }) => <li style={{ margin: compact ? '2px 0' : '4px 0', lineHeight: compact ? '1.4' : '1.5', color: 'var(--text-2)' }}>{children}</li>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
