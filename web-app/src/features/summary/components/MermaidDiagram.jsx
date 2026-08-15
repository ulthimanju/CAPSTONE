import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let mermaidInitialized = false;

// 1. Initialize Mermaid once with theme & typography matching the design tokens
function initMermaid() {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      // Prevents Mermaid from injecting its own error SVG ("bomb" graphic)
      // into the DOM on parse failure — we handle errors ourselves instead.
      suppressErrorRendering: true,
    });
    mermaidInitialized = true;
  }
}

export function MermaidDiagram({ chart, caption }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [renderError, setRenderError] = useState(null);

  useEffect(() => {
    if (!chart) return;
    let isMounted = true;
    initMermaid();

    const renderChart = async () => {
      try {
        // 2. Unique SVG ID per render to prevent namespace/gradient collisions
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const cleanChart = chart.trim();

        // 3. Asynchronous compilation from Mermaid definition to SVG string
        const { svg } = await mermaid.render(id, cleanChart);

        if (isMounted) {
          setSvgContent(svg);
          setRenderError(null);
        }
      } catch (err) {
        console.warn('Mermaid rendering error:', err);
        if (isMounted) {
          // Fail gracefully in-place, with the message shown inline
          setRenderError(err?.message || 'Failed to render diagram.');
        }
      }
    };

    renderChart();
    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (!chart) return null;

  if (renderError) {
    return (
      <div className="my-4 rounded-ui border border-danger/30 bg-danger-tint p-4 text-xs text-danger shadow-sm">
        <p className="font-mono font-bold uppercase tracking-wider">Diagram Syntax Warning</p>
        <p className="mt-1 font-mono text-[11px] opacity-85 whitespace-pre-wrap">
          {renderError}
        </p>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-ui border border-sep-line bg-surface p-4 shadow-sm">
      {/* 4. Responsive SVG container with horizontal scroll support */}
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
