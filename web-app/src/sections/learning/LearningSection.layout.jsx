/**
 * LearningSection — Structural Layout Layer
 *
 * Renders structured learning path curriculum units with MarkdownRenderer,
 * individual unit expand/collapse, and an option to inspect raw API JSON payload.
 */

import React, { useState } from 'react';
import { MarkdownRenderer, Button, Card, Badge } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { CopyPayloadButton } from '@/components/ui/CopyPayloadButton';
import { BookOpen, CheckCircle, ChevronDown, ChevronUp, Code2, Sparkles } from 'lucide-react';

export function LearningSectionLayout({
  workspaceId,
  learningData,
  isLoading,
  isGenerating,
  error,
  onRefetch,
  onGenerate,
}) {
  const [showRaw, setShowRaw] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState({});

  // Extract content payload: backend returns { learning_path: { title, description, units } } or direct
  const rawPayload = learningData?.learning_path !== undefined ? learningData.learning_path : learningData;
  const payload = rawPayload?.learning_path_json || rawPayload?.generated || rawPayload;

  const title = payload?.title || 'Workspace Curriculum';
  const description = payload?.description;
  const units = payload?.units || [];

  const hasContent = Boolean(description || (Array.isArray(units) && units.length > 0));

  const toggleUnit = (index) => {
    setExpandedUnits((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', width: '100%' }}>
      {/* Page Header with Actions */}
      <PageHeader
        title={title}
        description="Structured curriculum and learning modules derived from your workspace documents"
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <CopyPayloadButton payload={learningData} />
          <Button variant="secondary" size="sm" onClick={onRefetch} disabled={isLoading || isGenerating}>
            Refetch Payload
          </Button>
          <Button variant="primary" size="sm" onClick={onGenerate} loading={isGenerating} disabled={isLoading}>
            Generate Learning Path
          </Button>
        </div>
      </PageHeader>

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
      ) : !hasContent ? (
        /* Empty State */
        <div
          style={{
            padding: 'var(--space-10) var(--space-6)',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--line)',
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
          <Button variant="primary" size="md" onClick={onGenerate} loading={isGenerating}>
            <Sparkles size={16} style={{ marginRight: 'var(--space-2)' }} />
            Generate Learning Path
          </Button>
        </div>
      ) : (
        /* Structured Learning Path View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Header Card / Curriculum Overview */}
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--line)',
              padding: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 'var(--space-3)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Badge variant="primary" size="sm">
                    Curriculum
                  </Badge>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {units.length} Learning {units.length === 1 ? 'Unit' : 'Units'}
                  </span>
                </div>
                <h2
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 'var(--weight-bold)',
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  {title}
                </h2>
              </div>

              {/* Raw JSON inspection toggle */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRaw(!showRaw)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}
              >
                <Code2 size={14} style={{ marginRight: 'var(--space-1)' }} />
                {showRaw ? 'Hide Raw JSON' : 'Inspect Raw JSON'}
              </Button>
            </div>

            {description && (
              <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 'var(--space-3)' }}>
                <MarkdownRenderer content={description} />
              </div>
            )}
          </div>

          {/* Raw JSON Drawer (collapsible) */}
          {showRaw && (
            <div
              style={{
                background: 'var(--bg-sunken)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                overflowX: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-2)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--accent)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 'var(--weight-semibold)',
                }}
              >
                <span>RAW LEARNING PATH PAYLOAD</span>
                <span>{JSON.stringify(learningData).length} bytes</span>
              </div>
              <pre
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {JSON.stringify(learningData, null, 2)}
              </pre>
            </div>
          )}

          {/* Units List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h3
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--weight-semibold)',
                color: 'var(--text)',
                margin: 0,
                paddingLeft: 'var(--space-1)',
              }}
            >
              Learning Modules & Milestones
            </h3>

            {units.map((unit, index) => {
              const isExpanded = Boolean(expandedUnits[index]);

              return (
                <div
                  key={unit.id || index}
                  style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--line)',
                    overflow: 'hidden',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleUnit(index)}
                    style={{
                      width: '100%',
                      padding: 'var(--space-4) var(--space-5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'inherit',
                      gap: 'var(--space-4)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1 }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--bg-raised)',
                          border: '1px solid var(--line)',
                          color: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'var(--text-xs)',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 'var(--weight-bold)',
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span
                          style={{
                            fontSize: 'var(--text-base)',
                            fontWeight: 'var(--weight-semibold)',
                            color: 'var(--text)',
                          }}
                        >
                          {unit.title}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      style={{
                        padding: 'var(--space-4) var(--space-5) var(--space-5)',
                        borderTop: '1px solid var(--line-soft)',
                        background: 'var(--bg-raised)',
                      }}
                    >
                      <MarkdownRenderer content={unit.description} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
