/**
 * LearningUnitSection — Structural Layout Layer
 *
 * Full-page learning unit experience with header slots via HeaderPortal,
 * sub-tab navbar (Summary, Flashcards, Quiz, Problems), and interactive views.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MarkdownRenderer, MermaidRenderer, Button, Badge, Spinner } from '@/components/ui';
import { HeaderPortal } from '@/components/layout/HeaderPortal';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  HelpCircle,
  Code2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function LearningUnitSectionLayout({
  workspaceId,
  unitMeta,
  contentData,
  hasContent,
  isLoading,
  isGenerating,
  generationProgressText,
  error,
  activeTab,
  onTabChange,

  // Flashcards
  cardIndex,
  isFlipped,
  onPrevCard,
  onNextCard,
  onFlipCard,

  // Quiz
  quizAnswers,
  quizScore,
  onSelectQuizOption,
  onResetQuiz,

  // Actions
  onGenerate,
}) {
  const navigate = useNavigate();

  const title = unitMeta?.title || 'Learning Unit';
  const flashcards = contentData?.flashcards || [];
  const quiz = contentData?.quiz || [];
  const problems = contentData?.problems || [];
  const summary = contentData?.summary || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', width: '100%' }}>
      {/* ── 1. Main Header Left Slot: Back to Learning Path Button ────────────── */}
      <HeaderPortal target="left">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/workspaces/${workspaceId}/learning`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          <ArrowLeft size={16} />
          Back to learning path
        </Button>
      </HeaderPortal>

      {/* ── 2. Main Header Center Slot: Unit Title ────────────────────────────── */}
      <HeaderPortal target="center">
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '480px',
          }}
          title={title}
        >
          {title}
        </div>
      </HeaderPortal>

      {/* ── 3. Main Header Actions Slot: Generate / Regenerate unit content ───── */}
      <HeaderPortal target="actions">
        <Button
          variant="primary"
          size="sm"
          onClick={onGenerate}
          loading={isGenerating}
          disabled={isLoading}
        >
          {hasContent ? 'Regenerate unit content' : 'Generate unit content'}
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

      {/* Generating Progress State */}
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
            Synthesizing Unit Content...
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-soft)' }}>
            {generationProgressText || 'Generating Summary, Flashcards, Quiz & Problems with Gemini...'}
          </div>
        </div>
      )}

      {/* ── 4. Tab Navbar below Header ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          borderBottom: '1px solid var(--line-soft)',
          paddingBottom: 'var(--space-1)',
        }}
      >
        {[
          { id: 'summary', label: 'Summary', icon: FileText },
          { id: 'flashcards', label: `Flashcards${flashcards.length ? ` (${flashcards.length})` : ''}`, icon: BookOpen },
          { id: 'quiz', label: `Quiz${quiz.length ? ` (${quiz.length})` : ''}`, icon: HelpCircle },
          { id: 'problems', label: `Problems${problems.length ? ` (${problems.length})` : ''}`, icon: Code2 },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-5)',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-medium)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                transition: 'color 0.15s ease, border-color 0.15s ease',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 5. Main Tab View Content ──────────────────────────────────────────── */}
      {isLoading ? (
        <div
          style={{
            padding: 'var(--space-12)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line)',
          }}
        >
          Loading learning unit...
        </div>
      ) : !hasContent && !isGenerating ? (
        /* Empty State */
        <div
          style={{
            padding: 'var(--space-12) var(--space-6)',
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
            <Sparkles size={24} />
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
              Unit Content Not Generated Yet
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-soft)', maxWidth: '480px' }}>
              Generate a unified study bundle containing a rich summary, interactive flashcards, quiz, and practice problems from your documents.
            </div>
          </div>
          <Button variant="primary" size="md" onClick={onGenerate}>
            <Sparkles size={16} style={{ marginRight: 'var(--space-2)' }} />
            Generate Unit Content
          </Button>
        </div>
      ) : (
        /* Render Selected Tab */
        <div style={{ width: '100%' }}>
          {/* ── TAB 1: SUMMARY ──────────────────────────────────────────────── */}
          {activeTab === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {/* Executive Overview */}
              {summary?.overview && (
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
                    Unit Overview
                  </div>
                  <MarkdownRenderer content={summary.overview} />
                </div>
              )}

              {/* Key Takeaways */}
              {summary?.key_takeaways && summary.key_takeaways.length > 0 && (
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
                    {summary.key_takeaways.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: 'var(--space-2)', lineHeight: 'var(--leading-normal)' }}>
                        <MarkdownRenderer content={item} style={{ display: 'inline' }} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sections */}
              {summary?.sections && summary.sections.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                  {summary.sections.map((sec, idx) => (
                    <div
                      key={idx}
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
                      <h3
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
                        {sec.title}
                      </h3>
                      <MarkdownRenderer content={sec.content} />
                      {sec.diagram && sec.diagram !== 'none' && (
                        <div
                          style={{
                            marginTop: 'var(--space-3)',
                            background: 'var(--bg-sunken)',
                            border: '1px solid var(--line-soft)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-4)',
                          }}
                        >
                          <MermaidRenderer chart={sec.diagram} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: FLASHCARDS ───────────────────────────────────────────── */}
          {activeTab === 'flashcards' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-6)',
                padding: 'var(--space-4) 0',
              }}
            >
              {flashcards.length > 0 ? (
                <>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Card {cardIndex + 1} of {flashcards.length}
                  </div>

                  {/* Flashcard Component */}
                  <div
                    onClick={onFlipCard}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onFlipCard();
                      }
                    }}
                    style={{
                      width: '100%',
                      maxWidth: '580px',
                      minHeight: '260px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius-xl)',
                      padding: 'var(--space-8)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                      position: 'relative',
                      transition: 'border-color 0.15s ease, transform 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 'var(--space-4)',
                        right: 'var(--space-5)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--accent)',
                        fontWeight: 'var(--weight-bold)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {isFlipped ? 'Answer' : 'Question'}
                    </span>

                    <div
                      style={{
                        fontSize: isFlipped ? 'var(--text-base)' : 'var(--text-xl)',
                        fontWeight: isFlipped ? 'var(--weight-normal)' : 'var(--weight-semibold)',
                        color: isFlipped ? 'var(--text-soft)' : 'var(--text)',
                        lineHeight: 'var(--leading-relaxed)',
                      }}
                    >
                      <MarkdownRenderer content={isFlipped ? flashcards[cardIndex]?.back : flashcards[cardIndex]?.front} />
                    </div>

                    <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Click card to flip ↺
                    </p>
                  </div>

                  {/* Navigation Controls */}
                  <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={onPrevCard}
                      disabled={cardIndex === 0}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
                    >
                      <ChevronLeft size={16} /> Previous
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={onNextCard}
                      disabled={cardIndex === flashcards.length - 1}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
                    >
                      Next <ChevronRight size={16} />
                    </Button>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>
                  No flashcards available for this unit.
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: QUIZ ─────────────────────────────────────────────────── */}
          {activeTab === 'quiz' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {quiz.length > 0 ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--line-soft)',
                      paddingBottom: 'var(--space-4)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-base)', color: 'var(--text)', fontWeight: 'var(--weight-semibold)' }}>
                      Score: {quizScore} / {quiz.length}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onResetQuiz}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
                    >
                      <RotateCcw size={14} /> Reset Quiz
                    </Button>
                  </div>

                  {quiz.map((q, qIdx) => {
                    const answeredOpt = quizAnswers[qIdx];
                    const isAnswered = answeredOpt !== undefined;

                    return (
                      <div
                        key={qIdx}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-lg)',
                          padding: 'var(--space-6)',
                        }}
                      >
                        <h4
                          style={{
                            fontSize: 'var(--text-base)',
                            fontWeight: 'var(--weight-semibold)',
                            color: 'var(--text)',
                            marginBottom: 'var(--space-4)',
                            display: 'flex',
                            gap: 'var(--space-2)',
                            margin: '0 0 var(--space-4) 0',
                          }}
                        >
                          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>Q{qIdx + 1}.</span> {q.question}
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2-5)', marginBottom: 'var(--space-3)' }}>
                          {q.options.map((opt, optIdx) => {
                            let border = '1px solid var(--line)';
                            let background = 'var(--bg-raised)';
                            let color = 'var(--text)';

                            if (isAnswered) {
                              if (optIdx === q.correct_answer) {
                                border = '1px solid var(--success, #10b981)';
                                background = 'var(--success-subtle, rgba(16, 185, 129, 0.1))';
                                color = 'var(--success-text, #059669)';
                              } else if (optIdx === answeredOpt) {
                                border = '1px solid var(--error, #ef4444)';
                                background = 'var(--error-subtle, rgba(239, 68, 68, 0.1))';
                                color = 'var(--error-text, #dc2626)';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => onSelectQuizOption(qIdx, optIdx)}
                                disabled={isAnswered}
                                style={{
                                  padding: 'var(--space-3) var(--space-4)',
                                  borderRadius: 'var(--radius-md)',
                                  fontSize: 'var(--text-sm)',
                                  border,
                                  background,
                                  color,
                                  cursor: isAnswered ? 'default' : 'pointer',
                                  textAlign: 'left',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 'var(--space-3)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', opacity: 0.7 }}>
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {isAnswered && (
                          <div
                            style={{
                              marginTop: 'var(--space-3)',
                              paddingTop: 'var(--space-3)',
                              borderTop: '1px solid var(--line-soft)',
                              fontSize: 'var(--text-sm)',
                              color: 'var(--text-soft)',
                              lineHeight: 'var(--leading-relaxed)',
                            }}
                          >
                            <strong
                              style={{
                                color: answeredOpt === q.correct_answer ? 'var(--success-text, #059669)' : 'var(--error-text, #dc2626)',
                                display: 'block',
                                marginBottom: 'var(--space-1)',
                              }}
                            >
                              {answeredOpt === q.correct_answer ? '✓ Correct!' : '✗ Incorrect'}
                            </strong>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>
                  No quiz questions available for this unit.
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: PROBLEMS ─────────────────────────────────────────────── */}
          {activeTab === 'problems' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {problems.length > 0 ? (
                problems.map((prob, pIdx) => {
                  const isEasy = prob.difficulty?.toLowerCase() === 'easy';
                  const isMedium = prob.difficulty?.toLowerCase() === 'medium';
                  const diffColor = isEasy ? '#10b981' : isMedium ? '#f59e0b' : '#ef4444';

                  return (
                    <div
                      key={pIdx}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-6)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-3)',
                      }}
                    >
                      {/* Header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 'var(--space-3)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                          <h4
                            style={{
                              fontSize: 'var(--text-base)',
                              fontWeight: 'var(--weight-bold)',
                              color: 'var(--text)',
                              margin: 0,
                            }}
                          >
                            {prob.title}
                          </h4>
                          {prob.platform && (
                            <Badge variant="primary" size="sm">
                              {prob.platform}
                            </Badge>
                          )}
                          {prob.difficulty && (
                            <span
                              style={{
                                fontSize: 'var(--text-xs)',
                                fontWeight: 'var(--weight-bold)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                color: diffColor,
                                border: `1px solid ${diffColor}`,
                              }}
                            >
                              {prob.difficulty}
                            </span>
                          )}
                        </div>

                        {prob.url && (
                          <a
                            href={prob.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 'var(--space-1-5)',
                              padding: 'var(--space-2) var(--space-4)',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--accent)',
                              color: '#ffffff',
                              fontSize: 'var(--text-sm)',
                              fontWeight: 'var(--weight-medium)',
                              textDecoration: 'none',
                            }}
                          >
                            Solve Problem
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>

                      {/* Description */}
                      {prob.description && (
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-soft)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>
                          {prob.description}
                        </p>
                      )}

                      {/* Concepts */}
                      {prob.concepts && prob.concepts.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Concepts:</span>
                          {prob.concepts.map((c, cIdx) => (
                            <span
                              key={cIdx}
                              style={{
                                fontSize: 'var(--text-xs)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-raised)',
                                border: '1px solid var(--line-soft)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>
                  No practice problems available for this unit.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
