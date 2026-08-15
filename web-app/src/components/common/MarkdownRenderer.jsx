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

function CodeBlock({ node, inline, className = '', children, ...props }) {
  const [copied, setCopied] = React.useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const codeText = String(children).replace(/\n$/, '');
  const isMultiLine = typeof children === 'string' && children.includes('\n');
  const isBlock = Boolean(match || isMultiLine);

  // If single-line inline code snippet (e.g. `CreateProcess()`), render as compact inline badge
  if (!isBlock || inline) {
    return (
      <code
        className={`rounded bg-sand/80 px-1.5 py-0.5 font-mono text-[11px] sm:text-xs font-semibold text-accent border border-sep-line/40 inline align-baseline ${className}`}
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
    <div className="relative my-3 overflow-hidden rounded-ui border border-sep-line bg-sand/20 shadow-sm">
      <div className="flex items-center justify-between bg-sand/40 px-3 py-1 text-[11px] font-mono text-text/70 border-b border-sep-line/40">
        <span className="font-semibold uppercase tracking-wider">{match ? match[1] : 'CODE'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded border border-sep-line/40 bg-surface px-2 py-0.5 text-[10px] font-mono text-text/80 transition-colors hover:bg-sand hover:text-accent"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-text">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

const defaultComponents = {
  code: CodeBlock,
  table: ({ children, ...props }) => (
    <div className="my-4 overflow-x-auto rounded-ui border border-sep-line bg-surface shadow-sm">
      <table className="min-w-full divide-y divide-sep-line text-left font-sans text-xs sm:text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-sand/60 font-mono text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-text/80" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody className="divide-y divide-sep-line bg-surface" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr className="hover:bg-surface-hover/50 transition-colors" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th className="px-4 py-2.5 align-top font-bold text-text border-r border-sep-line last:border-r-0 tracking-wider" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-4 py-2.5 align-top text-text/80 border-r border-sep-line last:border-r-0 leading-relaxed" {...props}>
      {children}
    </td>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-2 last:mb-0 leading-relaxed" {...props}>
      {children}
    </p>
  ),
  a: ({ children, ...props }) => (
    <a target="_blank" rel="noopener noreferrer" className="text-accent underline hover:opacity-80" {...props}>
      {children}
    </a>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-3 border-l-4 border-accent/40 bg-sand/20 py-2 px-3.5 italic text-text/80 rounded-r-ui"
      {...props}
    >
      {children}
    </blockquote>
  ),
  hr: (props) => (
    <hr className="my-4 border-t border-sep-line" {...props} />
  ),
  input: ({ type, ...props }) =>
    type === 'checkbox' ? (
      <input type="checkbox" disabled className="mr-1.5 align-middle" {...props} />
    ) : (
      <input type={type} {...props} />
    ),
};

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
