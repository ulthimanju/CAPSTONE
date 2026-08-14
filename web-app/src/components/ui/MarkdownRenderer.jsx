import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

import { MermaidRenderer } from './MermaidRenderer';

/**
 * MarkdownRenderer — Universal content renderer using app design system tokens
 *
 * Supports GFM, KaTeX math, fenced code syntax highlighting, Mermaid diagrams,
 * and inline HTML with full design token consistency.
 */
export function MarkdownRenderer({ content, className = '', style = {} }) {
  if (!content) return null;

  return (
    <div
      className={`markdown-content ${className}`}
      style={{
        lineHeight: 'var(--leading-relaxed, 1.625)',
        fontSize: 'var(--text-base, 0.875rem)',
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
        color: 'var(--text)',
        ...style,
      }}
    >
      <style>{`
        .markdown-content pre,
        .markdown-content pre code,
        .markdown-content code.hljs,
        .markdown-content .hljs {
          background-color: var(--bg-sunken) !important;
          background: var(--bg-sunken) !important;
          color: var(--text) !important;
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
        components={{
          code({ inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';

            if (!inline && lang === 'mermaid') {
              return <MermaidRenderer chart={String(children).trim()} />;
            }

            if (inline) {
              return (
                <code
                  className={className}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--bg-sunken)',
                    color: 'var(--accent)',
                    padding: 'var(--space-1) var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-sm)',
                    border: '1px solid var(--line-soft)',
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={className}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)' }}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children, ...props }) {
            if (
              React.isValidElement(children) &&
              (children.props?.className?.includes('language-mermaid') ||
               children.type === MermaidRenderer)
            ) {
              return <>{children}</>;
            }
            return (
              <pre
                style={{
                  background: 'var(--bg-sunken)',
                  color: 'var(--text)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)',
                  overflowX: 'auto',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-mono)',
                  margin: 'var(--space-3) 0',
                }}
                {...props}
              >
                {children}
              </pre>
            );
          },
          table({ children, ...props }) {
            return (
              <div style={{ overflowX: 'auto', margin: 'var(--space-4) 0' }}>
                <table
                  style={{
                    borderCollapse: 'collapse',
                    width: '100%',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--line)',
                  }}
                  {...props}
                >
                  {children}
                </table>
              </div>
            );
          },
          thead({ children, ...props }) {
            return (
              <thead style={{ background: 'var(--bg-raised)', borderBottom: '2px solid var(--line)' }} {...props}>
                {children}
              </thead>
            );
          },
          tr({ children, ...props }) {
            return (
              <tr style={{ borderBottom: '1px solid var(--line)' }} {...props}>
                {children}
              </tr>
            );
          },
          th({ children, ...props }) {
            return (
              <th
                style={{
                  border: '1px solid var(--line)',
                  background: 'var(--bg-raised)',
                  color: 'var(--text)',
                  fontWeight: 'var(--weight-bold)',
                  fontSize: 'var(--text-sm)',
                  padding: 'var(--space-3) var(--space-4)',
                  textAlign: 'left',
                  fontFamily: 'var(--font-body)',
                }}
                {...props}
              >
                {children}
              </th>
            );
          },
          td({ children, ...props }) {
            return (
              <td
                style={{
                  border: '1px solid var(--line)',
                  padding: 'var(--space-3) var(--space-4)',
                  fontSize: 'var(--text-base)',
                  color: 'var(--text-soft)',
                  fontFamily: 'var(--font-body)',
                }}
                {...props}
              >
                {children}
              </td>
            );
          },
          a({ children, ...props }) {
            return (
              <a
                style={{
                  color: 'var(--accent)',
                  fontWeight: 'var(--weight-medium)',
                  textDecoration: 'none',
                }}
                target="_blank"
                rel="noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
          h1({ children, ...props }) {
            return (
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-3xl)',
                  color: 'var(--text)',
                  fontWeight: 'var(--weight-bold)',
                  marginTop: 'var(--space-6)',
                  marginBottom: 'var(--space-3)',
                }}
                {...props}
              >
                {children}
              </h1>
            );
          },
          h2({ children, ...props }) {
            return (
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-2xl)',
                  color: 'var(--text)',
                  fontWeight: 'var(--weight-semibold)',
                  marginTop: 'var(--space-5)',
                  marginBottom: 'var(--space-2)',
                }}
                {...props}
              >
                {children}
              </h2>
            );
          },
          h3({ children, ...props }) {
            return (
              <h3
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xl)',
                  color: 'var(--text)',
                  fontWeight: 'var(--weight-semibold)',
                  marginTop: 'var(--space-4)',
                  marginBottom: 'var(--space-2)',
                }}
                {...props}
              >
                {children}
              </h3>
            );
          },
          blockquote({ children, ...props }) {
            return (
              <blockquote
                style={{
                  borderLeft: '3px solid var(--accent)',
                  background: 'var(--accent-ghost)',
                  margin: 'var(--space-4) 0',
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-soft)',
                  fontStyle: 'italic',
                }}
                {...props}
              >
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
