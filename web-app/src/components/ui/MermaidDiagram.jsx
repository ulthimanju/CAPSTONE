import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
});

function parseSubgraphsIntoIndividualDiagrams(code) {
  if (!code) return [];
  const raw = code.trim();

  // If no subgraph block present, return single diagram
  if (!/subgraph\s+/i.test(raw)) {
    return [{ title: null, code: raw }];
  }

  // Extract flow direction header (default flowchart TD)
  const headerMatch = raw.match(/^\s*(flowchart|graph)\s+([A-Za-z]+)/i);
  const flowHeader = headerMatch ? `${headerMatch[1]} ${headerMatch[2]}` : 'flowchart TD';

  const subgraphRegex = /subgraph\s+(?:"([^"]+)"|([^\s\n"\[\]]+))([\s\S]*?)end/gi;
  const diagrams = [];
  let match;

  while ((match = subgraphRegex.exec(raw)) !== null) {
    const title = (match[1] || match[2] || '').trim();
    const innerContent = match[3].trim();
    if (innerContent) {
      diagrams.push({
        title,
        code: `${flowHeader}\n${innerContent}`,
      });
    }
  }

  if (diagrams.length === 0) {
    return [{ title: null, code: raw }];
  }

  return diagrams;
}

function SingleMermaidRender({ code, onError }) {
  const [svgHtml, setSvgHtml] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!code) {
      setIsLoading(false);
      setError('No diagram syntax available');
      if (onError) onError();
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
      .render(uniqueId, code, tempContainer)
      .then(({ svg }) => {
        if (!cancelled) {
          setSvgHtml(svg);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[Mermaid Error]', err, code);
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
    return <div style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>Rendering diagram...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#999', border: '1px solid #ccc', borderRadius: '4px' }}>
        {error}
      </div>
    );
  }

  return (
    <div
      className="mermaid-wrapper"
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}

export function MermaidDiagram({ code, source, chart, content, title = 'Diagram', onError }) {
  const rawCode = (code || source || chart || content || '').trim();
  const subDiagrams = parseSubgraphsIntoIndividualDiagrams(rawCode);

  if (subDiagrams.length > 1) {
    return (
      <div className="subgraphs-standalone-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
        {subDiagrams.map((sub, idx) => (
          <div className="subgraph-standalone-card" key={idx} style={{ width: '100%' }}>
            {sub.title && (
              <div className="subgraph-standalone-title">
                {sub.title}
              </div>
            )}
            <SingleMermaidRender code={sub.code} onError={onError} />
          </div>
        ))}
      </div>
    );
  }

  return <SingleMermaidRender code={rawCode} onError={onError} />;
}
