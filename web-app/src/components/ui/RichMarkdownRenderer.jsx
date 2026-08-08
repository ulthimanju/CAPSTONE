import React, { useEffect, useRef, useState, useMemo, useId } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
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
      suppressErrorRendering: true,
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
    suppressErrorRendering: true,
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

// ── Diagram Type Detector ──────────────────────────────────────────────────
const getMermaidDiagramType = (code) => {
  const firstLine = (code || '')
    .trim()
    .split(/\r?\n/)
    .find(Boolean) || '';

  if (/^(flowchart|graph)\b/i.test(firstLine)) {
    return 'flowchart';
  }
  if (/^classDiagram\b/i.test(firstLine)) {
    return 'classDiagram';
  }
  if (/^sequenceDiagram\b/i.test(firstLine)) {
    return 'sequenceDiagram';
  }
  if (/^stateDiagram(?:-v2)?\b/i.test(firstLine)) {
    return 'stateDiagram';
  }
  return 'unknown';
};

// ── Multiline Flowchart Label Sanitizer ────────────────────────────────────
const sanitizeFlowchartLabels = (code) => {
  return code.replace(
    /([A-Za-z0-9_]+)\s*\[([\s\S]*?)\]/g,
    (match, nodeId, rawLabel) => {
      const label = rawLabel.trim();

      if (!label) {
        return match;
      }

      // If already quoted and single-line, preserve
      if (label.startsWith('"') && label.endsWith('"') && !label.includes('\n')) {
        return `${nodeId}[${label}]`;
      }

      // Strip outer quotes if multiline and quote properly
      let inner = label;
      if (inner.startsWith('"') && inner.endsWith('"')) {
        inner = inner.slice(1, -1);
      }

      const safeLabel = inner
        .replace(/\r?\n/g, '<br/>')
        .replace(/\\n/g, '<br/>')
        .replace(/"/g, "'");

      return `${nodeId}["${safeLabel}"]`;
    }
  );
};

// ── Mermaid Syntax Auto-Sanitizer & Pre-Processor ──────────────────────────
const sanitizeMermaidCode = (code) => {
  if (!code || typeof code !== 'string') return '';
  let clean = code.trim();

  // 1. Strip markdown fences if accidentally included inside code block
  clean = clean.replace(/^```mermaid\s*/i, '').replace(/```$/i, '').trim();

  // 2. Normalize escaped newlines
  clean = clean.replace(/\\n/g, '\n');

  // 3. Fix unquoted subgraph titles with spaces: `subgraph Single Inheritance` -> `subgraph "Single Inheritance"`
  clean = clean.replace(/^(\s*subgraph\s+)(?!["'\n])([^\n]+)$/gim, (match, prefix, title) => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.includes(' ') && !trimmedTitle.startsWith('"') && !trimmedTitle.startsWith('[')) {
      return `${prefix}"${trimmedTitle}"`;
    }
    return match;
  });

  // 4. Remove raw HTML tags like <code>, </code>, <span>, </span> while preserving text and <br/>
  clean = clean.replace(/<\/?(code|span|div|p|strong|em)[^>]*>/gi, '');

  // 5. Apply diagram-specific label sanitization
  const type = getMermaidDiagramType(clean);
  if (type === 'flowchart') {
    clean = sanitizeFlowchartLabels(clean);
  }

  // 6. Fix invalid classDiagram syntax like `+calculateSalary()* int` -> `+calculateSalary() int`
  clean = clean.replace(/(\+\w+\([^)]*\))\*\s*(\w+)/g, '$1 $2');

  return clean;
};

// ── Remove Stray Body-Level Mermaid DOM Nodes ────────────────────────────────
// Mermaid's internal render8() prefixes the wrapper it appends to <body> with
// "d" + the id we passed in (e.g. id "rmc-mermaid-xyz" -> wrapper "drmc-mermaid-xyz"),
// and on some error paths (renderer.draw throwing after Diagram.fromText("error"))
// it does NOT clean that wrapper up even with suppressErrorRendering set.
// This is a defense-in-depth backstop; the primary fix is rendering into our own
// detached container (see renderMermaidSafely) so mermaid never touches body at all.
const cleanupStrayMermaidNodes = () => {
  if (typeof document === 'undefined') return;
  document
    .querySelectorAll(
      [
        'body > div[id^="d"]',
        'body > svg[aria-roledescription="error"]',
        'body > svg .error-icon',
        'body > iframe[id^="i"]',
      ].join(', ')
    )
    .forEach((el) => {
      // Only remove nodes that are actually ours / mermaid's, not unrelated app UI.
      const isOurs =
        el.id?.startsWith('drmc-mermaid-') ||
        el.id?.startsWith('irmc-mermaid-') ||
        el.querySelector?.('svg[id^="rmc-mermaid-"]') ||
        el.getAttribute?.('aria-roledescription') === 'error' ||
        el.querySelector?.('.error-icon');
      if (isOurs) el.remove();
    });
};

// ── Collision-Free Monotonic Mermaid ID Generator ───────────────────────────
const generateMermaidId = (reactId) => {
  const cleanId = (reactId || '').replace(/:/g, '');
  return `rmc-mermaid-${cleanId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
};

// ── Error SVG Validation Helper ──────────────────────────────────────────
const isMermaidErrorSvg = (svg) => {
  if (!svg || typeof svg !== 'string') return true;

  return (
    svg.includes('aria-roledescription="error"') ||
    svg.includes('class="error-icon"') ||
    svg.includes('Syntax error') ||
    svg.includes('Parse error') ||
    svg.includes('error-text') ||
    svg.includes('dmermaid-')
  );
};

// ── Mermaid Render Engine with Silent Syntax Validation & Cleanup ──────────
//
// IMPORTANT: mermaid.render(id, code) — called with only 2 args — makes mermaid
// internally do `select("body").append("div#d" + id).append("svg#" + id)` before
// it even attempts to parse/draw anything. On most parse failures this scratch
// node is removed via suppressErrorRendering, but on renderer-level draw failures
// (a second, separate try/catch inside mermaid's render8()) mermaid calls its own
// errorRenderer directly into that body-level node and does NOT remove it — that
// stray "bomb" SVG is what was showing up at the bottom of the page.
//
// The fix: pass a THIRD argument — our own detached, off-DOM container element —
// so mermaid renders (and on error, mis-renders) inside a node WE own and control,
// and it never touches document.body at all. We create a fresh scratch element
// per render call so concurrent/streaming renders can't collide.
const renderMermaidSafely = async (id, rawCode) => {
  const clean = sanitizeMermaidCode(rawCode);

  if (!clean) {
    throw new Error('Empty Mermaid diagram');
  }

  // Detached scratch container — never appended to the live document, so
  // anything mermaid writes into it (including its own error SVG) is simply
  // garbage-collected with it and can never leak into the visible page.
  const scratch = document.createElement('div');
  scratch.style.position = 'absolute';
  scratch.style.visibility = 'hidden';
  scratch.style.pointerEvents = 'none';
  scratch.style.left = '-99999px';
  scratch.style.top = '-99999px';

  try {
    mermaid.initialize(getMermaidTheme());

    // Perform silent syntax validation: returns false if invalid syntax without rendering error UI
    const isValid = await mermaid.parse(clean, { suppressErrors: true });

    if (!isValid) {
      throw new Error('Invalid Mermaid syntax');
    }

    const { svg } = await mermaid.render(id, clean, scratch);

    if (!svg || isMermaidErrorSvg(svg)) {
      throw new Error('Mermaid rendering failed');
    }

    return svg;
  } finally {
    // scratch was never attached to the DOM, so there is nothing to detach.
    // Kept as a belt-and-suspenders backstop in case a future mermaid version,
    // a different code path (e.g. sandbox securityLevel), or a race condition
    // still ends up writing to document.body.
    cleanupStrayMermaidNodes();
  }
};

// ── Helper to split multi-subgraph / multi-diagram Mermaid blocks ──────────
const splitMermaidCode = (code) => {
  if (!code || typeof code !== 'string') return [];
  const trimmed = code.trim();
  const lines = trimmed.split('\n');
  let header = lines[0].trim();

  if (!/^(graph|flowchart|sequenceDiagram|classDiagram|erDiagram|stateDiagram|journey|gantt|pie)\b/i.test(header)) {
    header = 'graph TD';
  }

  // Extract top-level subgraph blocks
  const subgraphs = [];
  let currentSubgraph = [];
  let depth = 0;
  let inSubgraph = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTrim = line.trim();

    if (/^subgraph\b/i.test(lineTrim)) {
      if (depth === 0) {
        inSubgraph = true;
        currentSubgraph = [line];
      } else {
        currentSubgraph.push(line);
      }
      depth++;
    } else if (lineTrim.toLowerCase() === 'end' && inSubgraph) {
      depth--;
      currentSubgraph.push(line);
      if (depth === 0) {
        subgraphs.push(currentSubgraph.join('\n'));
        currentSubgraph = [];
        inSubgraph = false;
      }
    } else if (inSubgraph) {
      currentSubgraph.push(line);
    }
  }

  if (subgraphs.length >= 2) {
    return subgraphs.map((sg) => {
      const sgTrim = sg.trim();
      if (/^(graph|flowchart|sequenceDiagram|classDiagram|erDiagram|stateDiagram)\b/i.test(sgTrim)) {
        return sgTrim;
      }
      return `${header}\n${sgTrim}`;
    });
  }

  return [];
};

// ── Sub-diagram Column Item Component ─────────────────────────────────────
const MermaidSubItem = ({ code, theme, onError }) => {
  const containerRef = useRef(null);
  const reactId = useId();
  const mermaidId = useMemo(() => generateMermaidId(reactId), [reactId]);
  const renderVersion = useRef(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const version = ++renderVersion.current;
    if (!containerRef.current || !code?.trim()) return;

    containerRef.current.innerHTML = '';
    setFailed(false);

    const render = async () => {
      try {
        const svg = await renderMermaidSafely(mermaidId, code);
        if (version !== renderVersion.current || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
      } catch (err) {
        if (version !== renderVersion.current) return;
        setFailed(true);
        console.warn('Sub-diagram rendering failed:', err?.message);
        onError?.(err);
      } finally {
        cleanupStrayMermaidNodes();
      }
    };

    render();

    return () => {
      renderVersion.current++;
      cleanupStrayMermaidNodes();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [code, theme, mermaidId, onError]);

  if (failed) return null;

  return (
    <div className="rmc-mermaid-column-item">
      <div
        ref={containerRef}
        aria-label="Mermaid sub-diagram"
        style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
      />
    </div>
  );
};

// ── Sub-diagram Group: escalates to parent only if ALL sub-diagrams fail ────
const MermaidSubGroup = ({ subDiagrams, theme, onError }) => {
  const failCount = useRef(0);
  const hasReportedGroupError = useRef(false);

  const handleSubError = (err) => {
    failCount.current += 1;
    if (failCount.current >= subDiagrams.length && !hasReportedGroupError.current) {
      hasReportedGroupError.current = true;
      onError?.(err);
    }
  };

  return (
    <div className="rmc-mermaid-wrap">
      <div className="rmc-mermaid-column-list">
        {subDiagrams.map((subCode, index) => (
          <MermaidSubItem key={index} code={subCode} theme={theme} onError={handleSubError} />
        ))}
      </div>
    </div>
  );
};

// ── Mermaid Diagram Component ──────────────────────────────────────────────
const MermaidDiagram = ({ code, onError }) => {
  const containerRef = useRef(null);
  const reactId = useId();
  const mermaidId = useMemo(() => generateMermaidId(reactId), [reactId]);
  const renderVersion = useRef(0);
  const hasReportedError = useRef(false);
  const [status, setStatus] = useState('idle');
  const [theme, setTheme] = useState(
    typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') || 'light' : 'light'
  );

  const subDiagrams = useMemo(() => splitMermaidCode(code), [code]);

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
    const version = ++renderVersion.current;
    if (subDiagrams.length >= 2) return;

    if (!containerRef.current || !code?.trim()) {
      return;
    }

    setStatus('validating');
    containerRef.current.innerHTML = '';

    const render = async () => {
      try {
        setStatus('rendering');
        const svg = await renderMermaidSafely(mermaidId, code);

        if (version !== renderVersion.current || !containerRef.current) return;

        containerRef.current.innerHTML = svg;
        setStatus('rendered');
      } catch (err) {
        if (version !== renderVersion.current) return;

        console.warn('Mermaid diagram could not be rendered and was hidden.', {
          error: err?.message,
        });

        setStatus('fallback');
        if (containerRef.current) containerRef.current.innerHTML = '';

        // Notify the nearest ancestor (e.g. a summary section) so it can choose
        // to hide itself instead of showing a broken/empty diagram card.
        // Fire at most once per mount to avoid re-render loops if the parent
        // re-renders this component in response to onError.
        if (!hasReportedError.current) {
          hasReportedError.current = true;
          onError?.(err);
        }
      } finally {
        cleanupStrayMermaidNodes();
      }
    };

    render();

    return () => {
      renderVersion.current++;
      cleanupStrayMermaidNodes();

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [code, theme, subDiagrams, mermaidId, onError]);

  if (subDiagrams.length >= 2) {
    return (
      <MermaidSubGroup subDiagrams={subDiagrams} theme={theme} onError={onError} />
    );
  }

  if (status === 'fallback') {
    return (
      <div className="rmc-mermaid-fallback-card">
        <i className="ti ti-chart-dots" />
        <span>Diagram preview unavailable</span>
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
const CodeBlock = ({ className, children, onMermaidError }) => {
  const match = /language-(\w+)/.exec(className || '');
  let lang = match ? match[1] : '';
  let rawCodeString = extractTextContent(children).replace(/\n$/, '');

  if (rawCodeString.includes('\\n')) {
    rawCodeString = rawCodeString.replace(/\\n/g, '\n');
  }

  const trimmed = rawCodeString.trim();

  // If code block is a ```diagram block or contains visual flow cards, render as live visual elements
  if (lang.toLowerCase() === 'diagram' || trimmed.includes('flow-card')) {
    const cleanHtml = trimmed
      .replace(/^diagram\s*/i, '')
      .replace(/className=/gi, 'class=');
    return (
      <div
        className="rmc-flow-card-embed my-4"
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    );
  }

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
    return <MermaidDiagram code={cleanCode} onError={onMermaidError} />;
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
// onMermaidError: optional callback(error) fired when a mermaid diagram in this
// content block fails to render. Useful for consumers (e.g. an AI summary
// section) that want to hide the whole section rather than show a broken or
// empty diagram placeholder.
export const RichMarkdownRenderer = ({ content, compact = false, onMermaidError }) => {
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

  // Normalize JSX `className=` to standard HTML `class=` for raw HTML parsing
  if (normalizedContent.includes('className=')) {
    normalizedContent = normalizedContent.replace(/className=/gi, 'class=');
  }

  // Unescape HTML entities if HTML tags were entity-encoded
  if (normalizedContent.includes('&lt;div') || normalizedContent.includes('&lt;span')) {
    normalizedContent = normalizedContent
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
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
          rehypeRaw,
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
              <CodeBlock className={className} onMermaidError={onMermaidError}>
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
