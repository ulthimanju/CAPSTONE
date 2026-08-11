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
        color: 'var(--text-faint)',
        fontSize: '12px',
        border: '1px solid var(--border-soft)',
        background: 'var(--bg-2)',
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
        gap: '6px',
        color: 'var(--text-faint)',
        fontSize: '12px',
        border: '1px solid var(--border-soft)',
        background: 'var(--bg-2)',
        padding: '16px',
        textAlign: 'center',
      }}
      role="status"
      aria-label={`Diagram unavailable for ${title}`}
    >
      <span>{error}</span>
    </div>
  );
}

export function MermaidDiagram({ source, title, sectionId }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    if (!source?.trim()) {
      setState({ status: 'error', message: "This diagram couldn't be displayed." });
      return () => {
        cancelled = true;
      };
    }

    setState({ status: 'loading' });

    mermaid
      .parse(source)
      .then(() => mermaid.render(`diagram-${sectionId}`, source))
      .then(({ svg }) => {
        if (!cancelled) setState({ status: 'ok', svg });
      })
      .catch((err) => {
        // Full detail goes to logs/monitoring only — never surfaced to the user.
        console.error(
          `Mermaid render failed for section "${title}" (id: ${sectionId}):`,
          err
        );
        if (!cancelled) {
          setState({
            status: 'error',
            message: "This diagram couldn't be displayed.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [source, title, sectionId]);

  if (state.status === 'loading') return <DiagramSkeleton />;
  if (state.status === 'error') {
    return <DiagramFallback title={title} error={state.message} />;
  }
  return <div dangerouslySetInnerHTML={{ __html: state.svg }} />;
}

export default MermaidDiagram;
