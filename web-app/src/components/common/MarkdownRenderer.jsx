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
import 'highlight.js/styles/github.css';
import { MermaidDiagram } from '@/features/summary/components/MermaidDiagram';

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

  // Render Mermaid diagrams directly inside markdown text using existing MermaidDiagram component
  if (match && match[1]?.toLowerCase() === 'mermaid') {
    return (
      <div className="my-3">
        <MermaidDiagram chart={codeText} />
      </div>
    );
  }

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
    <div className="relative my-3 overflow-hidden rounded-ui border border-sep-line/80 bg-surface shadow-xs">
      <div className="flex items-center justify-between border-b border-sep-line/60 bg-surface-hover px-3.5 py-1.5 text-[11px] font-mono">
        <span className="font-semibold uppercase tracking-wider text-accent">{match ? match[1] : 'CODE'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded border border-sep-line/70 bg-surface px-2 py-0.5 text-[10px] font-mono text-text/80 transition-colors hover:bg-surface-hover hover:text-accent shadow-2xs"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed bg-surface text-text hljs">
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
  h1: ({ children, ...props }) => (
    <h1 className="mt-6 mb-3 font-display text-lg font-bold text-text border-b border-sep-line/60 pb-1.5" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="mt-5 mb-2.5 font-display text-base font-bold text-text flex items-center gap-2" {...props}>
      <span className="h-2 w-2 rounded-full bg-accent inline-block"></span>
      <span>{children}</span>
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mt-4 mb-2 font-display text-sm font-semibold text-text tracking-wide text-accent" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="mt-3 mb-1.5 font-display text-xs font-semibold text-text uppercase tracking-wider" {...props}>
      {children}
    </h4>
  ),
  ul: ({ children, ...props }) => (
    <ul className="my-2.5 space-y-1.5 pl-6 sm:pl-7 list-disc list-outside text-text/85 text-xs sm:text-sm marker:text-accent" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="my-2.5 space-y-1.5 pl-6 sm:pl-7 list-decimal list-outside text-text/85 text-xs sm:text-sm marker:font-mono marker:text-accent marker:font-bold" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed pl-1.5" {...props}>
      {children}
    </li>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-2.5 last:mb-0 leading-relaxed text-text/85" {...props}>
      {children}
    </p>
  ),
  a: ({ children, ...props }) => (
    <a target="_blank" rel="noopener noreferrer" className="text-accent underline hover:opacity-80 font-medium" {...props}>
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

/**
 * Converts LaTeX vertical fraction notation (\frac{A}{B}) into clean inline division (A/B)
 */
function replaceLatexFractions(str) {
  if (!str || (!str.includes('\\frac') && !str.includes('\\tfrac') && !str.includes('\\cfrac'))) {
    return str;
  }

  function findMatchingBrace(text, startIdx) {
    let depth = 0;
    for (let i = startIdx; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  let result = '';
  let i = 0;
  while (i < str.length) {
    const fracMatch = str.slice(i).match(/^\\(?:frac|tfrac|cfrac)\s*\{/);
    if (fracMatch) {
      const numStart = i + fracMatch[0].length;
      const numEnd = findMatchingBrace(str, numStart - 1);
      if (numEnd !== -1 && str[numEnd + 1] === '{') {
        const denStart = numEnd + 2;
        const denEnd = findMatchingBrace(str, denStart - 1);
        if (denEnd !== -1) {
          const num = replaceLatexFractions(str.slice(numStart, numEnd).trim());
          const den = replaceLatexFractions(str.slice(denStart, denEnd).trim());
          const needsParenNum = /[+\-]/.test(num) && !num.startsWith('(');
          const needsParenDen = /[+\-*\/]/.test(den) && !den.startsWith('(');
          const fmtNum = needsParenNum ? `(${num})` : num;
          const fmtDen = needsParenDen ? `(${den})` : den;
          result += `${fmtNum}/${fmtDen}`;
          i = denEnd + 1;
          continue;
        }
      }
    }
    result += str[i];
    i++;
  }
  return result;
}

/**
 * Preprocesses markdown text:
 * 1. Converts stacked LaTeX fractions (\frac{1}{2}) to clean inline division (1/2)
 * 2. Prevents bold currency expressions ("**$50** to **$60**") from triggering math mode
 * 3. Keeps valid LaTeX math and equations intact
 */
export function preprocessMarkdownForMath(text) {
  if (!text || typeof text !== 'string') return text;

  // Unescape literal escaped newlines and tabs if present (from double-encoded JSON)
  let raw = text;
  if (raw.includes('\\n')) {
    raw = raw.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  }

  // Protect code blocks (```...``` and `...`) from being modified
  const protectedBlocks = [];
  let processed = raw.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    protectedBlocks.push(match);
    return `__PROTECTED_CODE_BLOCK_${protectedBlocks.length - 1}__`;
  });

  // Convert LaTeX fractions (\frac{A}{B}) to inline division (A/B)
  processed = replaceLatexFractions(processed);

  // 1. Escape currency inside bold/italic markdown spans (e.g. "**$50** to **$60**" or "*$50*")
  processed = processed.replace(
    /(\*{1,2}|_{1,2})\$(\d+(?:,\d{3})*(?:\.\d+)?(?:k|m|b|bn|tn)?)\1/gi,
    (m, p1, p2) => `${p1}\\\\$${p2}${p1}`
  );

  // 2. Escape standalone multi-word currency ranges (e.g. "$50 to $60" or "$50 - $60")
  processed = processed.replace(
    /\$(\d+(?:,\d{3})*(?:\.\d+)?)\s+(to|and|or|from|-)\s+\$(\d+(?:,\d{3})*(?:\.\d+)?)/gi,
    (m, p1, p2, p3) => `\\\\$${p1} ${p2} \\\\$${p3}`
  );

  // 3. Fix false-positive inline math spans only when inner text is pure English sentence without math operators/subscripts
  processed = processed.replace(/\$([^\$\n]+)\$/g, (match, inner) => {
    // If it contains backslash (\rightarrow, \alpha, etc.), subscripts (_), superscripts (^), or math operators, it IS math!
    const isMath = /[\\_^=+\-<>\/\(\)\{\}]/.test(inner);
    if (isMath) {
      return match;
    }
    const hasEnglishWords = /\s+(to|from|and|or|in|with|for|the|is|are|was|were|increases|decreases|than|means|which|simplifies)\s+/i.test(inner);
    if (hasEnglishWords) {
      return `\\$${inner}\\$`;
    }
    return match;
  });

  // Restore protected blocks
  processed = processed.replace(/__PROTECTED_CODE_BLOCK_(\d+)__/g, (_, idx) => protectedBlocks[Number(idx)] || '');

  return processed;
}

function MarkdownRendererBase({
  content,
  className = '',
  style = {},
  allowHtml = true,
  softBreaks = false,
  components = {},
  ...htmlAttrs
}) {
  if (!content) return null;

  const sanitizedContent = React.useMemo(() => preprocessMarkdownForMath(content), [content]);

  const remarkPlugins = React.useMemo(() => {
    const plugins = [remarkGfm, remarkMath];
    if (softBreaks) plugins.push(remarkBreaks);
    return plugins;
  }, [softBreaks]);

  const rehypePlugins = React.useMemo(() => {
    const plugins = [];
    if (allowHtml) {
      plugins.push(rehypeRaw, [rehypeSanitize, sanitizeSchema]);
    }
    plugins.push(
      [rehypeKatex, { output: 'htmlAndMathml', throwOnError: false, strict: false, errorColor: '#cc0000' }],
      rehypeSlug,
      rehypeHighlight
    );
    return plugins;
  }, [allowHtml]);

  const mergedComponents = React.useMemo(
    () => ({ ...defaultComponents, ...components }),
    [components]
  );

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
        components={mergedComponents}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownRenderer = React.memo(MarkdownRendererBase);
export default MarkdownRenderer;
