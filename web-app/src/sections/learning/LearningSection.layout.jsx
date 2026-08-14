/**
 * LearningSection — Structural Layout Layer
 *
 * Renders structured learning path modules as elegant grid cards matching design specs,
 * with Generate/Regenerate Learning Path button in the main header via HeaderPortal.
 */

import React from 'react';
import { MarkdownRenderer, Button } from '@/components/ui';
import { HeaderPortal } from '@/components/layout/HeaderPortal';
import { BookOpen, Sparkles } from 'lucide-react';

export function LearningSectionLayout({
  workspaceId,
  learningData,
  isLoading,
  isGenerating,
  error,
  onGenerate,
}) {
  // Extract content payload: backend returns { learning_path: { title, description, units } } or direct
  const rawPayload = learningData?.learning_path !== undefined ? learningData.learning_path : learningData;
  const payload = rawPayload?.learning_path_json || rawPayload?.generated || rawPayload;

  const description = payload?.description;
  const units = payload?.units || [];

  const hasContent = Boolean(description || (Array.isArray(units) && units.length > 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', width: '100%' }}>
      {/* Header Action Portal — places Generate / Regenerate button on main-header right side */}
      <HeaderPortal>
        <Button
          variant="primary"
          size="sm"
          onClick={onGenerate}
          loading={isGenerating}
          disabled={isLoading}
        >
          {hasContent ? 'Regenerate Learning Path' : 'Generate Learning Path'}
        </Button>
      </HeaderPortal>

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

      {/* Generating Indicator */}
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
          <div
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--weight-semibold)',
              color: 'var(--text)',
              marginBottom: 'var(--space-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <Sparkles size={20} color="var(--accent)" />
            Generating Learning Path...
          </div>
          <div style={{ fontSize: 'var(--text-sm)' }}>
            Analyzing workspace documents and structuring progressive learning milestones.
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
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line)',
          }}
        >
          Loading learning path...
        </div>
      ) : !hasContent && !isGenerating ? (
        /* Empty State */
        <div
          style={{
            padding: 'var(--space-10) var(--space-6)',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--line)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-raised)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <BookOpen size={24} />
          </div>
          <div>
            <div
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--weight-semibold)',
                color: 'var(--text)',
                marginBottom: 'var(--space-1)',
              }}
            >
              No Learning Path Generated Yet
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-soft)', maxWidth: '480px' }}>
              Synthesize your workspace documentation into a structured, step-by-step modular curriculum.
            </div>
          </div>
          <Button variant="primary" size="md" onClick={onGenerate}>
            <Sparkles size={16} style={{ marginRight: 'var(--space-2)' }} />
            Generate Learning Path
          </Button>
        </div>
      ) : (
        /* Learning Modules Grid Cards */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-6)',
            width: '100%',
          }}
        >
          {units.map((unit, index) => {
            const moduleNum = String(index + 1).padStart(2, '0');

            return (
              <div
                key={unit.id || index}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--line)',
                  padding: 'var(--space-6) var(--space-7)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                }}
              >
                {/* Module Number Label */}
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--weight-semibold)',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  MODULE {moduleNum}
                </div>

                {/* Module Title */}
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 'var(--weight-bold)',
                    color: 'var(--text)',
                    lineHeight: 'var(--leading-snug)',
                    margin: 0,
                  }}
                >
                  {unit.title}
                </h3>

                {/* Module Description */}
                {unit.description && (
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-sm)',
                      lineHeight: 'var(--leading-relaxed)',
                      color: 'var(--text-soft)',
                    }}
                  >
                    <MarkdownRenderer content={unit.description} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
