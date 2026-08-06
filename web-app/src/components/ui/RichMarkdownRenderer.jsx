import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import mermaid from 'mermaid';
import 'katex/dist/katex.min.css';
import './RichMarkdown.css';

// Initialize mermaid with custom theme matching app design tokens
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  themeVariables: {
    background: '#0c0c0e',

    primaryColor: '#16161a',
    primaryTextColor: '#e4e4e7',
    primaryBorderColor: '#2a2a2e',

    secondaryColor: '#111113',
    secondaryTextColor: '#a1a1aa',
    secondaryBorderColor: '#1f1f22',

    tertiaryColor: '#16161a',
    tertiaryTextColor: '#e4e4e7',
    tertiaryBorderColor: '#2a2a2e',

    lineColor: '#52525b',
    textColor: '#e4e4e7',
    labelTextColor: '#e4e4e7',

    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSize: '13px',

    edgeLabelBackground: '#0c0c0e',

    clusterBkg: '#111113',
    clusterBorder: '#2a2a2e',

    // Flowchart specifics
    fillType0: '#16161a',
    fillType1: '#1f1f22',
    fillType2: '#1a1a1e',

    // Note / Special
    noteBkgColor: '#16161a',
    noteBorderColor: '#3ecf8e',
    noteTextColor: '#e4e4e7',

    // Sequence diagram
    activationBkgColor: '#1f1f22',
    activationBorderColor: '#3ecf8e',
    labelBoxBkgColor: '#16161a',
    labelBoxBorderColor: '#2a2a2e',
    sequenceNumberColor: '#0c0c0e',

    // Pie chart
    pie1: '#3ecf8e',
    pie2: '#3b82f6',
    pie3: '#f59e0b',
    pie4: '#e5484d',
    pie5: '#c084fc',
    pie6: '#67e8f9',
    pie7: '#86efac',
    pie8: '#fde68a',
  },
});

// ── Mermaid Diagram ────────────────────────────────────────────────────────
const MermaidDiagram = ({ code }) => {
  const containerRef = useRef(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    if (!containerRef.current || !code) return;
    containerRef.current.innerHTML = '';
    mermaid
      .render(idRef.current, code)
      .then(({ svg }) => {
        if (containerRef.current) containerRef.current.innerHTML = svg;
      })
      .catch((err) => {
        console.error('Mermaid render error:', err);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre style="color:#e5484d;font-size:12px;padding:8px;">${code}</pre>`;
        }
      });
  }, [code]);

  return (
    <div className="rmc-mermaid-wrap">
      <div className="rmc-mermaid-label">
        <i className="ti ti-chart-bubble" style={{ marginRight: 5 }} />
        Diagram
      </div>
      <div className="rmc-mermaid-body" ref={containerRef} />
    </div>
  );
};

// ── Copy Button ────────────────────────────────────────────────────────────
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      className={`rmc-code-copy${copied ? ' copied' : ''}`}
      onClick={handleCopy}
      title="Copy code"
    >
      <i className={copied ? 'ti ti-check' : 'ti ti-copy'} />
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

// ── Code Block ─────────────────────────────────────────────────────────────
const CodeBlock = ({ className, children }) => {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const codeString = String(children).replace(/\n$/, '');

  if (lang === 'mermaid') {
    return <MermaidDiagram code={codeString} />;
  }

  return (
    <div className="rmc-code-block">
      <div className="rmc-code-header">
        <span className="rmc-code-lang">{lang || 'code'}</span>
        <CopyButton text={codeString} />
      </div>
      <pre>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
};

// ── Main Renderer ──────────────────────────────────────────────────────────
export const RichMarkdownRenderer = ({ content, compact = false }) => {
  if (!content) return null;

  return (
    <div className={`rich-markdown-content${compact ? ' rich-markdown-compact' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // Code: fenced blocks and inline
          code({ node, inline, className, children, ...props }) {
            if (inline) {
              return <code className={className} {...props}>{children}</code>;
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },

          // Pre: suppressed — CodeBlock renders its own <pre>
          pre({ children }) {
            return <>{children}</>;
          },

          // Table
          table({ children }) {
            return (
              <div className="rmc-table-wrap">
                <table>{children}</table>
              </div>
            );
          },
          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => <th>{children}</th>,
          td: ({ children }) => <td>{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
