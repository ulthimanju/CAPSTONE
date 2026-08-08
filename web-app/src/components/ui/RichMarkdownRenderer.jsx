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

// ── Dynamic Theme Helper for Mermaid ──────────────────────────────────────
const getMermaidTheme = () => {
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark';

  if (isDark) {
    return {
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      themeVariables: {
        background: '#1c2121',

        primaryColor: '#232828',
        primaryTextColor: '#F4F1F8',
        primaryBorderColor: '#3a4242',

        secondaryColor: '#2c3333',
        secondaryTextColor: '#c8cfcf',
        secondaryBorderColor: '#3a4242',

        tertiaryColor: '#232828',
        tertiaryTextColor: '#F4F1F8',
        tertiaryBorderColor: '#3a4242',

        lineColor: '#a0a8a8',
        textColor: '#F4F1F8',
        labelTextColor: '#F4F1F8',

        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: '13px',

        edgeLabelBackground: '#1c2121',

        clusterBkg: '#232828',
        clusterBorder: '#3a4242',

        fillType0: '#232828',
        fillType1: '#2c3333',
        fillType2: '#242b2b',

        noteBkgColor: '#232828',
        noteBorderColor: '#4D7CF5',
        noteTextColor: '#F4F1F8',

        activationBkgColor: '#2c3333',
        activationBorderColor: '#4D7CF5',
        labelBoxBkgColor: '#232828',
        labelBoxBorderColor: '#3a4242',
        sequenceNumberColor: '#1c2121',

        pie1: '#3ecf8e',
        pie2: '#3b82f6',
        pie3: '#f59e0b',
        pie4: '#e5484d',
        pie5: '#c084fc',
        pie6: '#67e8f9',
        pie7: '#86efac',
        pie8: '#fde68a',
      },
    };
  }

  return {
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    themeVariables: {
      background: '#FFFFFF',

      primaryColor: '#F9F8FC',
      primaryTextColor: '#141717',
      primaryBorderColor: '#D4CEE3',

      secondaryColor: '#EFECEF',
      secondaryTextColor: '#3a3f42',
      secondaryBorderColor: '#D4CEE3',

      tertiaryColor: '#FFFFFF',
      tertiaryTextColor: '#141717',
      tertiaryBorderColor: '#D4CEE3',

      lineColor: '#5c6265',
      textColor: '#141717',
      labelTextColor: '#141717',

      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      fontSize: '13px',

      edgeLabelBackground: '#FFFFFF',

      clusterBkg: '#F9F8FC',
      clusterBorder: '#D4CEE3',

      fillType0: '#F9F8FC',
      fillType1: '#EFECEF',
      fillType2: '#FFFFFF',

      noteBkgColor: '#F9F8FC',
      noteBorderColor: '#4D7CF5',
      noteTextColor: '#141717',

      activationBkgColor: '#EFECEF',
      activationBorderColor: '#4D7CF5',
      labelBoxBkgColor: '#F9F8FC',
      labelBoxBorderColor: '#D4CEE3',
      sequenceNumberColor: '#FFFFFF',

      pie1: '#3ecf8e',
      pie2: '#3b82f6',
      pie3: '#f59e0b',
      pie4: '#e5484d',
      pie5: '#c084fc',
      pie6: '#67e8f9',
      pie7: '#86efac',
      pie8: '#fde68a',
    },
  };
};

// ── Mermaid Syntax Auto-Sanitizer & Pre-Processor ──────────────────────────
const sanitizeMermaidCode = (code) => {
  if (!code || typeof code !== 'string') return '';
  let clean = code.trim();

  // 1. Strip markdown fences if accidentally included inside code block
  clean = clean.replace(/^```mermaid\s*/i, '').replace(/```$/i, '').trim();

  // 2. Fix unquoted subgraph titles with spaces: `subgraph Single Inheritance` -> `subgraph "Single Inheritance"`
  clean = clean.replace(/^(\s*subgraph\s+)(?!["'\n])([^\n]+)$/gim, (match, prefix, title) => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.includes(' ') && !trimmedTitle.startsWith('"') && !trimmedTitle.startsWith('[')) {
      return `${prefix}"${trimmedTitle}"`;
    }
    return match;
  });

  // 3. Remove raw HTML tags like <code>, </code>, <span>, </span> while preserving text and <br/>
  clean = clean.replace(/<\/?(code|span|div|p|strong|em)[^>]*>/gi, '');

  // 4. Wrap unquoted node labels containing special chars (/ ( ) : , etc.) in quotes:
  // e.g. P[Polymorphism] --> C[Compile-Time Polymorphism / Static Binding] -> C["Compile-Time Polymorphism / Static Binding"]
  clean = clean.replace(/(\[[^\]\n]+\])/g, (match) => {
    const inner = match.slice(1, -1).trim();
    if ((inner.includes('/') || inner.includes(':') || inner.includes('(') || inner.includes(')')) && !inner.startsWith('"')) {
      const safeInner = inner.replace(/"/g, "'");
      return `["${safeInner}"]`;
    }
    return match;
  });

  // 5. Fix invalid classDiagram syntax like `+calculateSalary()* int` -> `+calculateSalary() int`
  clean = clean.replace(/(\+\w+\([^)]*\))\*\s*(\w+)/g, '$1 $2');

  return clean;
};

// ── Mermaid Render Engine ──────────────────────────────────────────────────
const renderMermaidSafely = async (id, rawCode) => {
  const clean = sanitizeMermaidCode(rawCode);

  if (!clean) {
    throw new Error('Empty Mermaid diagram');
  }

  mermaid.initialize(getMermaidTheme());

  try {
    await mermaid.parse(clean);
  } catch (parseErr) {
    console.warn('Mermaid parse pre-check failed, attempting render anyway:', parseErr);
  }

  const { svg } = await mermaid.render(id, clean);
  return svg;
};

// ── Mermaid Diagram Component ──────────────────────────────────────────────
const MermaidDiagram = ({ code }) => {
  const containerRef = useRef(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(
    typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') || 'light' : 'light'
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'light');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

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
  }, [code, theme]);

  if (error) {
    // If diagram rendering fails even after auto-sanitization, render as formatted code block
    return (
      <div className="rmc-code-block my-3 border border-[var(--border-subtle)] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-2)] border-b border-[var(--border-subtle)] text-xs text-[var(--text-3)] font-mono">
          <span>mermaid</span>
        </div>
        <pre className="p-3 text-xs font-mono overflow-x-auto text-[var(--text-2)] bg-[var(--bg-1)]">
          <code>{code}</code>
        </pre>
      </div>
    );
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
