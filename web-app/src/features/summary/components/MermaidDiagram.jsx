import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let mermaidInitialized = false;

function initMermaid() {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'JetBrains Mono, Menlo, monospace',
    });
    mermaidInitialized = true;
  }
}

export function MermaidDiagram({ chart, caption }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    if (!chart) return;

    let isMounted = true;
    initMermaid();

    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const cleanChart = chart.trim();
        const { svg } = await mermaid.render(id, cleanChart);
        if (isMounted) {
          setSvgContent(svg);
          setRenderError(false);
        }
      } catch (err) {
        console.warn('Mermaid diagram rendering error:', err);
        if (isMounted) {
          setRenderError(true);
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (!chart || renderError) {
    return null;
  }

  return (
    <div className="my-4 rounded-ui border border-sep-line bg-surface p-4 shadow-sm">
      <div
        ref={containerRef}
        className="flex justify-center overflow-x-auto py-2"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      {caption && (
        <p className="mt-2 text-center font-mono text-xs text-text/60 italic">
          {caption}
        </p>
      )}
    </div>
  );
}

export default MermaidDiagram;
