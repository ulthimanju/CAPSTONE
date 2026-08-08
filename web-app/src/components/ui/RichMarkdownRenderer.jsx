import React, { useEffect, useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import mermaid from 'mermaid';
import hljs from 'highlight.js';
import { formatCodeWithLanguageFormatter } from '../../utils/codeFormatters';
import 'katex/dist/katex.min.css';
import './RichMarkdown.css';

// ── Highlight.js Code Highlighter Helper ──────────────────────────────────
const getHighlightedCode = (code, language) => {
  if (!code) return '';
  const validLang = language && hljs.getLanguage(language) ? language : null;
  try {
    if (validLang) {
      return hljs.highlight(code, { language: validLang }).value;
    }
    return hljs.highlightAuto(code).value;
  } catch {
    return null;
  }
};

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

// ── Mermaid Render Engine ──────────────────────────────────────────────────
const renderMermaidSafely = async (id, code) => {
  const clean = code?.trim();

  if (!clean) {
    throw new Error('Empty Mermaid diagram');
  }

  await mermaid.parse(clean);

  const { svg } = await mermaid.render(id, clean);

  return svg;
};

// ── Mermaid Diagram Component ──────────────────────────────────────────────
const MermaidDiagram = ({ code }) => {
  const containerRef = useRef(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      if (!containerRef.current || !code?.trim()) {
        return;
      }

      setError(null);
      containerRef.current.innerHTML = '';

      try {
        const svg = await renderMermaidSafely(idRef.current, code);

        if (cancelled) return;

        containerRef.current.innerHTML = svg;
      } catch (err) {
        if (cancelled) return;

        console.error('Mermaid rendering failed:', {
          code,
          error: err,
        });

        setError(err);
        containerRef.current.innerHTML = '';
      }
    };

    render();

    return () => {
      cancelled = true;

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [code]);

  if (error) {
    return null;
  }

  return (
    <div className="rmc-mermaid-wrap">
      <div
        ref={containerRef}
        className="rmc-mermaid-body"
        aria-label="Mermaid diagram"
      />
    </div>
  );
};

// ── Copy Code Button ───────────────────────────────────────────────────────
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

// ── Helper to extract plain text string recursively from React node trees ────
const extractTextContent = (node) => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextContent).join('');
  if (typeof node === 'object' && node.props) {
    return extractTextContent(node.props.children);
  }
  return '';
};

// ── Code Block Component ───────────────────────────────────────────────────
const CodeBlock = ({ className, children }) => {
  const match = /language-(\w+)/.exec(className || '');
  let lang = match ? match[1] : '';
  let rawCodeString = extractTextContent(children).replace(/\n$/, '');

  if (rawCodeString.includes('\\n')) {
    rawCodeString = rawCodeString.replace(/\\n/g, '\n');
  }

  const trimmed = rawCodeString.trim();
  const isMermaid =
    lang.toLowerCase() === 'mermaid' ||
    (!lang &&
      (
        /^graph\s+(TD|TB|BT|RL|LR)\b/i.test(trimmed) ||
        /^flowchart\s+(TD|TB|BT|RL|LR)\b/i.test(trimmed) ||
        /^sequenceDiagram\b/i.test(trimmed) ||
        /^classDiagram\b/i.test(trimmed) ||
        /^erDiagram\b/i.test(trimmed) ||
        /^stateDiagram(?:-v2)?\b/i.test(trimmed) ||
        /^journey\b/i.test(trimmed) ||
        /^gantt\b/i.test(trimmed) ||
        /^pie\b/i.test(trimmed)
      ));

  if (isMermaid) {
    const cleanCode = trimmed.replace(/^mermaid\s*/i, '');
    return <MermaidDiagram code={cleanCode} />;
  }

  const [formattedCode, setFormattedCode] = useState(rawCodeString);

  useEffect(() => {
    let active = true;
    formatCodeWithLanguageFormatter(rawCodeString, lang).then((result) => {
      if (active && result) {
        setFormattedCode(result);
      }
    });
    return () => {
      active = false;
    };
  }, [rawCodeString, lang]);

  const highlightedHtml = useMemo(() => {
    return getHighlightedCode(formattedCode, lang);
  }, [formattedCode, lang]);

  return (
    <div className="rmc-code-block">
      <div className="rmc-code-header">
        <span className="rmc-code-lang">{lang || 'code'}</span>
        <CopyButton text={formattedCode} />
      </div>
      <pre>
        {highlightedHtml ? (
          <code
            className={`hljs ${className || ''}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <code className={className}>{formattedCode}</code>
        )}
      </pre>
    </div>
  );
};

// ── Unified Markdown Renderer Component ───────────────────────────────────
export const RichMarkdownRenderer = ({ content, compact = false }) => {
  if (!content) return null;

  let normalizedContent = typeof content === 'string' ? content : String(content);

  // Unescape literal "\\n" and "\\t" string characters into real newlines and tabs
  if (normalizedContent.includes('\\n')) {
    normalizedContent = normalizedContent.replace(/\\n/g, '\n');
  }
  if (normalizedContent.includes('\\t')) {
    normalizedContent = normalizedContent.replace(/\\t/g, '\t');
  }
  if (normalizedContent.includes('\\"')) {
    normalizedContent = normalizedContent.replace(/\\"/g, '"');
  }

  // Transform LaTeX inline \(...\) and display \[...\] delimiters into $...$ and $$...$$
  normalizedContent = normalizedContent
    .replace(/\\\((\s*[\s\S]*?\s*)\\\)/g, (_, match) => `$${match}$`)
    .replace(/\\\[(\s*[\s\S]*?\s*)\\\]/g, (_, match) => `$$\n${match}\n$$`);

  return (
    <div className={`rich-markdown-content${compact ? ' rich-markdown-compact' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { throwOnError: false, errorColor: 'inherit', strict: false }],
          rehypeHighlight,
        ]}
        components={{
          // Pre element intercepts fenced code blocks and routes them to CodeBlock
          pre({ children }) {
            const childrenArray = React.Children.toArray(children);
            const codeElement = childrenArray.find((child) => child && child.type === 'code') || children;
            const className = codeElement?.props?.className || '';
            const codeContent = codeElement?.props?.children || children;

            return (
              <CodeBlock className={className}>
                {codeContent}
              </CodeBlock>
            );
          },

          // Code element handles inline backtick code exclusively
          code({ children, className, ...props }) {
            return (
              <code className={`rmc-inline-code ${className || ''}`} {...props}>
                {children}
              </code>
            );
          },

          // Formatted Tables
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

          // Links open securely in new tab
          a({ href, children, ...props }) {
            const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                {...props}
              >
                {children}
              </a>
            );
          },

          // Images
          img({ src, alt, ...props }) {
            return (
              <img
                src={src}
                alt={alt || 'Image'}
                style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border-soft)' }}
                {...props}
              />
            );
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};

// Aliases for unified consumption
export const MarkdownRenderer = RichMarkdownRenderer;
export default RichMarkdownRenderer;
