import React, { useEffect, useState, useCallback } from 'react';
import mermaid from 'mermaid';

/**
 * ---------------------------------------------------------------------------
 * THEME BRIDGE
 * ---------------------------------------------------------------------------
 * Maps the app's standard design system CSS variables into Mermaid's `theme: 'base'`
 * themeVariables so diagrams perfectly match light/dark app themes.
 * ---------------------------------------------------------------------------
 */
function readCssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

function buildThemeVariables(overrides = {}) {
  return {
    background: readCssVar('--bg-surface', '#231E16'),
    primaryColor: readCssVar('--bg-raised', '#2D2720'),
    primaryTextColor: readCssVar('--text', '#EDE4D0'),
    primaryBorderColor: readCssVar('--line', '#5A4C39'),
    secondaryColor: readCssVar('--bg-sunken', '#31291F'),
    secondaryTextColor: readCssVar('--text-soft', '#C8B99A'),
    secondaryBorderColor: readCssVar('--line-soft', '#3A3225'),
    tertiaryColor: readCssVar('--bg-raised', '#2D2720'),
    tertiaryTextColor: readCssVar('--text-soft', '#C8B99A'),
    tertiaryBorderColor: readCssVar('--line', '#5A4C39'),
    lineColor: readCssVar('--accent', '#C0641F'),
    textColor: readCssVar('--text', '#EDE4D0'),
    mainBkg: readCssVar('--bg-surface', '#231E16'),
    nodeBorder: readCssVar('--line', '#5A4C39'),
    clusterBkg: readCssVar('--bg-sunken', '#31291F'),
    clusterBorder: readCssVar('--line-soft', '#3A3225'),
    edgeLabelBackground: 'transparent',
    fontFamily: readCssVar('--font-body', 'system-ui, sans-serif'),
    fontSize: readCssVar('--text-base', '14px'),
    errorBkgColor: readCssVar('--error-subtle', 'rgba(231,76,60,0.15)'),
    errorTextColor: readCssVar('--error-text', '#FF6B5B'),
    ...overrides,
  };
}

let idCounter = 0;

/**
 * MermaidRenderer — Direct Mermaid diagram renderer component
 */
export function MermaidRenderer({
  chart,
  className = '',
  style = {},
  themeOverrides = {},
  mermaidTheme = 'base',
  watchThemeAttr = 'data-theme',
}) {
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);
  const [themeTick, setThemeTick] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new MutationObserver(() => setThemeTick((t) => t + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [watchThemeAttr, 'class'],
    });
    return () => observer.disconnect();
  }, [watchThemeAttr]);

  const render = useCallback(async () => {
    if (!chart) {
      setSvgContent('');
      setError(null);
      return;
    }

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: mermaidTheme,
      themeVariables: buildThemeVariables(themeOverrides),
    });

    const uniqueId = `mermaid-svg-${++idCounter}-${Date.now()}`;
    try {
      setError(null);

      let container = document.getElementById('mermaid-temp-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'mermaid-temp-container';
        container.style.position = 'absolute';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        container.style.opacity = '0';
        document.body.appendChild(container);
      }

      const { svg } = await mermaid.render(uniqueId, chart, container);
      setSvgContent(svg);
    } catch (err) {
      console.error('[MermaidRenderer] Render failed:', err);
      setError(err?.message || 'Failed to render Mermaid diagram');
    }
  }, [chart, mermaidTheme, themeOverrides]);

  useEffect(() => {
    render();
  }, [render, themeTick]);

  return (
    <>
      {error && (
        <div
          className={className}
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--error-subtle)',
            color: 'var(--error-text)',
            border: '1px solid var(--error)',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)',
            ...style,
          }}
        >
          <strong>Mermaid Render Error:</strong> {error}
        </div>
      )}

      {!error && svgContent && (
        <div
          className={`mermaid-diagram ${className}`}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 'var(--space-4)',
            overflowX: 'auto',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line)',
            ...style,
          }}
        >
          <style>{`
            .mermaid-diagram .edgeLabel rect,
            .mermaid-diagram .edgeLabel span,
            .mermaid-diagram .edgeLabel p,
            .mermaid-diagram .edgeLabel {
              background-color: transparent !important;
              background: transparent !important;
              border: none !important;
            }
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: svgContent }} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
        </div>
      )}
    </>
  );
}
