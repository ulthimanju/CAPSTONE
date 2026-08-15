import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

/**
 * MarkdownRenderer — Reusable Markdown component
 *
 * Supports:
 *  - GitHub Flavored Markdown (tables, strikethrough, task lists, autolinks) via remark-gfm
 *  - LaTeX math ($inline$ and $$block$$) via remark-math + rehype-katex
 *  - Syntax-highlighted fenced code blocks via rehype-highlight (highlight.js)
 *  - Raw HTML embedded in markdown, sanitized for safety, via rehype-raw + rehype-sanitize
 *  - Heading anchors via rehype-slug
 *  - Soft line breaks (single \n -> <br>) via remark-breaks (toggleable)
 *  - Copy-to-clipboard button on code blocks
 *  - Clean typography and table styling out of the box
 *
 * Install:
 *   npm install react-markdown remark-gfm remark-math remark-breaks
 *   npm install rehype-katex rehype-raw rehype-sanitize rehype-slug rehype-highlight
 *   npm install katex highlight.js
 */

// Extend the default sanitize schema so KaTeX output (spans/math classes),
// highlight.js classes, and a few common safe HTML elements survive sanitization.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span || []),
      ['className'],
      ['style'],
      ['aria-hidden'],
    ],
    div: [
      ...(defaultSchema.attributes?.div || []),
      ['className'],
      ['style'],
    ],
    code: [
      ...(defaultSchema.attributes?.code || []),
      ['className'],
    ],
    a: [
      ...(defaultSchema.attributes?.a || []),
      ['target'],
      ['rel'],
    ],
    '*': [...(defaultSchema.attributes?.['*'] || []), ['id']],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'details',
    'summary',
    'kbd',
    'mark',
    'sub',
    'sup',
  ],
};

function CodeBlock({ inline, className = '', children, ...props }) {
  const [copied, setCopied] = React.useState(false);
  const match = /language-(\w+)/.exec(className);
  const codeText = String(children).replace(/\n$/, '');

  if (inline) {
    return (
      <code
        className={className}
        style={{
          background: 'var(--code-bg, rgba(127,127,127,0.15))',
          padding: '0.15em 0.4em',
          borderRadius: '4px',
          fontSize: '0.9em',
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        }}
        {...props}
      >
        {children}
      </code>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available — fail silently
    }
  };

  return (
    <div style={{ position: 'relative', margin: '0.75em 0' }}>
      <button
        type="button"
        onClick={handleCopy}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          fontSize: '11px',
          padding: '2px 8px',
          borderRadius: '4px',
          border: '1px solid rgba(127,127,127,0.35)',
          background: 'var(--code-copy-bg, rgba(0,0,0,0.35))',
          color: 'var(--code-copy-fg, #eee)',
          cursor: 'pointer',
          zIndex: 1,
        }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre
        style={{
          overflowX: 'auto',
          borderRadius: '8px',
          padding: '1em',
          fontSize: '13px',
          lineHeight: 1.5,
        }}
      >
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
      {match ? (
        <span
          style={{
            position: 'absolute',
            top: '6px',
            left: '10px',
            fontSize: '11px',
            opacity: 0.55,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {match[1]}
        </span>
      ) : null}
    </div>
  );
}

const defaultComponents = {
  code: CodeBlock,
  table: ({ children, ...props }) => (
    <div style={{ overflowX: 'auto', margin: '0.75em 0' }}>
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          fontSize: '0.95em',
        }}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th
      style={{
        border: '1px solid var(--border, rgba(127,127,127,0.3))',
        padding: '6px 10px',
        textAlign: 'left',
        background: 'var(--table-header-bg, rgba(127,127,127,0.08))',
      }}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      style={{
        border: '1px solid var(--border, rgba(127,127,127,0.3))',
        padding: '6px 10px',
      }}
      {...props}
    >
      {children}
    </td>
  ),
  a: ({ children, ...props }) => (
    <a target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      style={{
        borderLeft: '3px solid var(--border, rgba(127,127,127,0.4))',
        margin: '0.75em 0',
        padding: '0.25em 1em',
        opacity: 0.85,
      }}
      {...props}
    >
      {children}
    </blockquote>
  ),
  hr: (props) => (
    <hr
      style={{
        border: 'none',
        borderTop: '1px solid var(--border, rgba(127,127,127,0.3))',
        margin: '1.25em 0',
      }}
      {...props}
    />
  ),
  input: ({ type, ...props }) =>
    type === 'checkbox' ? (
      <input type="checkbox" disabled style={{ marginRight: '0.4em' }} {...props} />
    ) : (
      <input type={type} {...props} />
    ),
};

/**
 * @param {string} content            Markdown source (required)
 * @param {string} className          Extra class(es) on the wrapper div
 * @param {object} style               Extra inline styles on the wrapper div
 * @param {boolean} allowHtml          Enable raw HTML passthrough (sanitized). Default: true
 * @param {boolean} softBreaks         Treat single newlines as <br>. Default: false (standard MD behavior)
 * @param {object} components          Override/extend the default renderer components
 * @param {object} htmlAttrs           Extra props spread onto the wrapper div (e.g. id, data-*)
 */
export function MarkdownRenderer({
  content,
  className = '',
  style = {},
  allowHtml = true,
  softBreaks = false,
  components = {},
  ...htmlAttrs
}) {
  if (!content) return null;

  const remarkPlugins = [remarkGfm, remarkMath];
  if (softBreaks) remarkPlugins.push(remarkBreaks);

  const rehypePlugins = [];
  if (allowHtml) {
    rehypePlugins.push(rehypeRaw, [rehypeSanitize, sanitizeSchema]);
  }
  rehypePlugins.push(rehypeKatex, rehypeSlug, rehypeHighlight);

  return (
    <div
      className={`markdown-content ${className}`}
      style={{
        lineHeight: '1.6',
        fontSize: '14px',
        color: 'var(--text)',
        wordBreak: 'break-word',
        ...style,
      }}
      {...htmlAttrs}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{ ...defaultComponents, ...components }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
