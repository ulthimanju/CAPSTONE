/**
 * SummarySection — Structural Layout Layer
 *
 * Beautifully renders workspace summary using MarkdownRenderer and MermaidRenderer.
 */

import React from 'react';
import { MarkdownRenderer, MermaidRenderer, Button } from '@/components/ui';

export function SummarySectionLayout({
  workspaceId,
  summaryData,
  isLoading,
  isGenerating,
  error,
  onGenerate,
}) {
  // Extract content payload: backend returns { summary: { overview, sections, key_takeaways } } or { summary_json: ... }
  const rawPayload = summaryData?.summary !== undefined ? summaryData.summary : summaryData;
  const payload = rawPayload?.summary_json || rawPayload?.generated || rawPayload;

  const overview = payload?.overview;
  const sections = payload?.sections || [];
  const keyTakeaways = payload?.key_takeaways || [];

  const hasContent = Boolean(overview || sections.length > 0 || keyTakeaways.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', width: '100%' }}>
      {/* Top Action Bar if content exists */}
      {hasContent && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={onGenerate}
            loading={isGenerating}
            disabled={isLoading}
          >
            Generate Summary
          </Button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--error-subtle)',
            color: 'var(--error-text)',
            border: '1px solid var(--error)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <strong>Error:</strong> {typeof error === 'object' ? JSON.stringify(error) : error}
        </div>
      )}

      {/* Generating / Loading State */}
      {isGenerating && (
        <div
          style={{
            padding: 'var(--space-8)',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text)', marginBottom: 'var(--space-2)' }}>
            Generating Workspace Summary...
          </div>
          <div style={{ fontSize: 'var(--text-sm)' }}>
            Synthesizing workspace documents with Gemini AI via real-time background processing.
          </div>
        </div>
      )}

      {/* Main Content Render */}
      {isLoading ? (
        <div
          style={{
            padding: 'var(--space-10)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Loading workspace summary...
        </div>
      ) : !hasContent && !isGenerating ? (
        <div
          style={{
            padding: 'var(--space-10)',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            border: '1px dashed var(--line)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-medium)', color: 'var(--text)', marginBottom: 'var(--space-2)' }}>
            No Workspace Summary Generated Yet
          </div>
          <div style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
            Click "Generate Summary" to synthesize document knowledge into a structured summary.
          </div>
          <Button variant="primary" size="md" onClick={onGenerate}>
            Generate Summary
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Executive Overview */}
          {overview && (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--accent)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--tracking-wider)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                Executive Overview
              </div>
              <MarkdownRenderer content={overview} />
            </div>
          )}

          {/* Sections with Markdown & Mermaid */}
          {sections.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {sections.map((section, idx) => (
                <div
                  key={section.id || idx}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-6)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-4)',
                  }}
                >
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--text-xl)',
                      fontWeight: 'var(--weight-semibold)',
                      color: 'var(--text)',
                      margin: 0,
                      paddingBottom: 'var(--space-2)',
                      borderBottom: '1px solid var(--line-soft)',
                    }}
                  >
                    {section.title}
                  </h2>

                  {/* Section Content */}
                  <MarkdownRenderer content={section.content} />

                  {/* Section Diagram if present */}
                  {section.diagram && section.diagram !== 'none' && (
                    <div
                      style={{
                        marginTop: 'var(--space-3)',
                        background: 'var(--bg-sunken)',
                        border: '1px solid var(--line-soft)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-4)',
                      }}
                    >
                      {section.diagram_caption && (
                        <div
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                            marginBottom: 'var(--space-2)',
                            textAlign: 'center',
                          }}
                        >
                          Figure {idx + 1}: {section.diagram_caption}
                        </div>
                      )}
                      <MermaidRenderer chart={section.diagram} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Key Takeaways */}
          {keyTakeaways.length > 0 && (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--accent)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--tracking-wider)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                Key Takeaways
              </div>
              <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', color: 'var(--text-soft)' }}>
                {keyTakeaways.map((item, i) => (
                  <li key={i} style={{ marginBottom: 'var(--space-2)', lineHeight: 'var(--leading-normal)' }}>
                    <MarkdownRenderer content={item} style={{ display: 'inline' }} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
