import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import hljs from 'highlight.js';
import { formatCodeWithLanguageFormatter } from '../../utils/codeFormatters';
import { useWorkspaceStore } from '../../contexts/WorkspaceContext';
import { MermaidDiagram } from './MermaidDiagram';
import 'katex/dist/katex.min.css';
import './RichMarkdown.css';

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

const extractTextContent = (node) => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextContent).join('');
  if (typeof node === 'object') {
    if (node.props?.children) return extractTextContent(node.props.children);
    if (node.children) return extractTextContent(node.children);
    if (node.value) return String(node.value);
  }
  return '';
};

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

const CodeBlock = ({ className, children }) => {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const rawCodeString = extractTextContent(children).replace(/\n$/, '');
  const [formattedCode, setFormattedCode] = useState(rawCodeString);

  useEffect(() => {
    let active = true;
    formatCodeWithLanguageFormatter(rawCodeString, lang).then((result) => {
      if (active && result) setFormattedCode(result);
    });
    return () => {
      active = false;
    };
  }, [rawCodeString, lang]);

  const highlightedHtml = useMemo(
    () => getHighlightedCode(formattedCode, lang),
    [formattedCode, lang]
  );

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

const normalizeContent = (value) => {
  let normalized = typeof value === 'string' ? value : String(value ?? '');

  if (normalized.includes('\\n')) normalized = normalized.replace(/\\n/g, '\n');
  if (normalized.includes('\\t')) normalized = normalized.replace(/\\t/g, '\t');
  if (normalized.includes('\\"')) normalized = normalized.replace(/\\"/g, '"');

  // Workspace-summary content is intentionally not supposed to contain HTML
  // or Mermaid. Keep this normalization only for legacy non-summary content.
  if (normalized.includes('\\(') || normalized.includes('\\[')) {
    normalized = normalized
      .replace(/\\\((\s*[\s\S]*?\s*)\\\)/g, (_, match) => `$${match}$`)
      .replace(/\\\[(\s*[\s\S]*?\s*)\\\]/g, (_, match) => `$$\n${match}\n$$`);
  }

  return normalized;
};

export const RichMarkdownRenderer = ({ content, compact = false }) => {
  if (!content) return null;

  const { summaryDiagrams } = useWorkspaceStore();
  const normalizedContent = normalizeContent(content);
  const diagram = summaryDiagrams?.[content] || null;

  return (
    <div className={`rich-markdown-content${compact ? ' rich-markdown-compact' : ''}`}>
      {diagram?.diagram_type !== 'none' && diagram?.diagram && (
        <figure
          style={{
            margin: '0 0 20px',
            padding: '16px',
            border: '1px solid var(--border-soft)',
            background: 'var(--bg-2)',
          }}
        >
          <MermaidDiagram
            source={diagram.diagram}
            title={diagram.title}
            sectionId={diagram.id}
          />
          {diagram.diagram_caption && (
            <figcaption
              style={{
                marginTop: '10px',
                color: 'var(--text-faint)',
                fontSize: '12px',
                lineHeight: '1.5',
              }}
            >
              {diagram.diagram_caption}
            </figcaption>
          )}
        </figure>
      )}

      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeKatex, { throwOnError: false, errorColor: 'inherit', strict: false }],
          rehypeHighlight,
        ]}
        components={{
          pre({ children, ...props }) {
            const childrenArray = React.Children.toArray(children);
            const codeElement = childrenArray.find(
              (child) => child && (child.type === 'code' || child.props?.className)
            ) || children;
            const className = codeElement?.props?.className || props.className || '';
            const codeContent = codeElement?.props?.children || children;

            return (
              <CodeBlock className={className} {...props}>
                {codeContent}
              </CodeBlock>
            );
          },
          code({ children, className, ...props }) {
            return (
              <code className={`rmc-inline-code ${className || ''}`} {...props}>
                {children}
              </code>
            );
          },
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

export const MarkdownRenderer = RichMarkdownRenderer;
export default RichMarkdownRenderer;
