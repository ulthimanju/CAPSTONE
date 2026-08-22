import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let mermaidInitialized = false;

// Initialize Mermaid with suppressed error SVG injection
function initMermaid() {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'strict',
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      suppressErrorRendering: true,
    });
    mermaidInitialized = true;
  }
}

export function MermaidDiagram({ chart, caption }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [hasError, setHasError] = useState(false);

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
          setHasError(false);
        }
      } catch (err) {
        console.warn('Mermaid diagram rendering failed, suppressing diagram:', err);
        if (isMounted) {
          setHasError(true);
        }
      }
    };

    renderChart();
    return () => {
      isMounted = false;
    };
  }, [chart]);

  // If there is no chart content, a syntax error was caught, or SVG is not yet compiled, do not render anything
  if (!chart || hasError || !svgContent) {
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
