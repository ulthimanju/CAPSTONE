import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'default',
});

function sanitizeMermaidCode(code) {
  if (!code) return '';
  let cleaned = code.trim();

  // Strip code block fences if present
  cleaned = cleaned.replace(/^```mermaid\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();

  // Replace escaped newlines
  cleaned = cleaned.replace(/\\n/g, '\n');

  // Ensure standard diagram header
  const validHeaderRegex = /^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|gantt|pie|gitGraph|mindmap|timeline|C4Context|architecture)/i;
  if (!validHeaderRegex.test(cleaned)) {
    cleaned = `flowchart TD\n${cleaned}`;
  }

  return cleaned;
}

function SingleMermaidRender({ code, onError }) {
  const [svgHtml, setSvgHtml] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const sanitized = sanitizeMermaidCode(code);

    if (!sanitized) {
      setIsLoading(false);
      setError('No diagram syntax available');
      return;
    }

    setIsLoading(true);
    setError(null);

    const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

    const tempContainer = document.createElement('div');
    tempContainer.id = `container-${uniqueId}`;
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.visibility = 'hidden';
    document.body.appendChild(tempContainer);

    mermaid
      .render(uniqueId, sanitized, tempContainer)
      .then(({ svg }) => {
        if (!cancelled) {
          setSvgHtml(svg);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[Mermaid Error]', err, sanitized);
          setError('Diagram unavailable');
          setIsLoading(false);
          if (onError) onError(err);
        }
      })
      .finally(() => {
        if (tempContainer && tempContainer.parentNode) {
          tempContainer.parentNode.removeChild(tempContainer);
        }
        const el = document.getElementById(uniqueId);
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });

    return () => {
      cancelled = true;
      if (tempContainer && tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
    };
  }, [code, onError]);

  if (isLoading) {
    return <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Rendering diagram...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '0.75rem var(--space-4)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
        <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{sanitizeMermaidCode(code)}</pre>
      </div>
    );
  }

  return (
    <div
      className="mermaid-wrapper"
      dangerouslySetInnerHTML={{ __html: svgHtml }}
      style={{ overflowX: 'auto', padding: 'var(--space-2) 0', display: 'flex', justifyContent: 'center' }}
    />
  );
}

export function MermaidDiagram({ code, source, chart, content, title = 'Diagram', onError }) {
  const rawCode = (code || source || chart || content || '').trim();
  return <SingleMermaidRender code={rawCode} onError={onError} />;
}
