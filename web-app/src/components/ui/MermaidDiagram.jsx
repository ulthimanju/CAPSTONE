import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  suppressErrorRendering: true,
  securityLevel: 'strict',
});

function DiagramSkeleton() {
  return (
    <div
      style={{
        minHeight: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-disabled)',
        fontSize: 'var(--font-size-sm)',
        border: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-elevated)',
      }}
      aria-label="Loading diagram"
    >
      Rendering diagram...
    </div>
  );
}

function DiagramFallback({ title, error }) {
  return (
    <div
      style={{
        minHeight: '80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-1-5)',
        color: 'var(--color-text-disabled)',
        fontSize: 'var(--font-size-sm)',
        border: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-elevated)',
        padding: 'var(--space-4)',
        textAlign: 'center',
      }}
      role="status"
      aria-label={`Diagram unavailable for ${title}`}
    >
      <span>{error}</span>
    </div>
  );
}

export function MermaidDiagram({ code, title = 'Diagram', onError }) {
  const [svgHtml, setSvgHtml] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    if (!code || !code.trim()) {
      setIsLoading(false);
      setError('No diagram syntax available');
      if (onError) onError();
      return;
    }

    const uniqueId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

    mermaid.render(uniqueId, code.trim())
      .then(({ svg }) => {
        if (isMounted) {
          setSvgHtml(svg);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError('Diagram unavailable');
          setIsLoading(false);
          if (onError) onError(err);
        }
      });

    return () => {
      isMounted = false;
      const element = document.getElementById(uniqueId);
      if (element) {
        element.remove();
      }
    };
  }, [code, onError]);

  if (isLoading) {
    return <DiagramSkeleton />;
  }

  if (error) {
    return <DiagramFallback title={title} error={error} />;
  }

  return (
    <div
      className="mermaid-wrapper flex justify-center items-center w-full py-4 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
