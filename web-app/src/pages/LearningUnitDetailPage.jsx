import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api/client';
import { tokenStorage } from '../lib/tokenStorage';
import { Spinner } from '../components/ui/Spinner';
import { RichMarkdownRenderer } from '../components/ui/RichMarkdownRenderer';
import { MermaidDiagram } from '../components/ui/MermaidDiagram';
import { useAuth } from '../hooks/useAuth';
import { AppLayout } from '../layouts/AppLayout';

export const LearningUnitDetailPage = () => {
  const { workspaceId, unitTitle } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const decodedTitle = decodeURIComponent(unitTitle || '');

  const [workspace, setWorkspace] = useState(null);
  const [unitMeta, setUnitMeta] = useState(null);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'flashcards' | 'quiz'
  const [contentData, setContentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationProgressText, setGenerationProgressText] = useState('');

  // Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(0);

  // Indices of summary sections whose mermaid diagram(s) failed to render.
  // Local UI-only concern; resets whenever contentData changes.
  const [hiddenSummarySections, setHiddenSummarySections] = useState(() => new Set());

  const hideSummarySection = (idx) => {
    setHiddenSummarySections((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  useEffect(() => {
    setHiddenSummarySections(new Set());
  }, [contentData]);

  // Load workspace & unit metadata
  useEffect(() => {
    if (!workspaceId) return;
    fetchWorkspaceAndUnit();
    fetchUnitContent();
  }, [workspaceId, unitTitle]);

  // Listen to SSE events for LearningUnitGeneration
  useEffect(() => {
    if (!workspaceId || !decodedTitle) return;
    const token = tokenStorage.getAccessToken();
    const sseUrl = token
      ? `/api/v1/workspaces/${workspaceId}/events?token=${encodeURIComponent(token)}`
      : `/api/v1/workspaces/${workspaceId}/events`;

    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          (data.event_name === 'LearningUnitGeneration' || data.event === 'LearningUnitGeneration') &&
          data.workspace_id === workspaceId &&
          data.unit_title === decodedTitle
        ) {
          if (data.status === 'QUEUED') setGenerationProgressText('Queued...');
          else if (data.status === 'STARTED') setGenerationProgressText('Retrieving RAG document context...');
          else if (data.status === 'IN_PROGRESS') setGenerationProgressText('Generating Summary, Flashcards, Quiz & Problems with Gemini...');
          else if (data.status === 'COMPLETED') {
            setGenerationProgressText('Completed!');
            fetchUnitContent();
            setGenerating(false);
          } else if (data.status === 'FAILED') {
            setGenerationProgressText('Failed: ' + (data.error || 'Unknown error'));
            setGenerating(false);
          }
        }
      } catch (e) {
        /* silent catch */
      }
    };

    return () => eventSource.close();
  }, [workspaceId, decodedTitle]);

  const fetchWorkspaceAndUnit = async () => {
    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const wsRes = await apiClient.get(`/api/v1/workspaces/${workspaceId}`, { headers });
      setWorkspace(wsRes.data);

      const lpRes = await apiClient.get(`/api/v1/workspaces/${workspaceId}/learning-path`, { headers });
      if (lpRes.data && lpRes.data.learning_path && lpRes.data.learning_path.units) {
        const found = lpRes.data.learning_path.units.find(
          (u) => u.title.toLowerCase() === decodedTitle.toLowerCase()
        );
        setUnitMeta(found || { title: decodedTitle });
      } else {
        setUnitMeta({ title: decodedTitle });
      }
    } catch (err) {
      console.error('Failed to load workspace/unit metadata:', err);
    }
  };

  const fetchUnitContent = async () => {
    try {
      setLoading(true);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await apiClient.get(
        `/api/v1/workspaces/${workspaceId}/units/content?unit_title=${encodeURIComponent(decodedTitle)}`,
        { headers }
      );
      if (res.data && res.data.content) {
        setContentData(res.data.content);

        // Restore quiz answers and score from stored DB user_answer values
        if (res.data.content.quiz && Array.isArray(res.data.content.quiz)) {
          const initialAnswers = {};
          let initialScore = 0;
          res.data.content.quiz.forEach((q, idx) => {
            if (q.user_answer !== undefined && q.user_answer !== null && q.user_answer !== -1) {
              initialAnswers[idx] = q.user_answer;
              if (q.user_answer === q.correct_answer) {
                initialScore += 1;
              }
            }
          });
          setQuizAnswers(initialAnswers);
          setQuizScore(initialScore);
        }
      } else {
        setContentData(null);
      }
    } catch (err) {
      console.error('Failed to fetch unit content:', err);
      setContentData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContent = async () => {
    try {
      setGenerating(true);
      setGenerationProgressText('Generating Summary, Flashcards, Quiz & Problems with Gemini...');
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await apiClient.post(
        `/api/v1/ai/workspaces/${workspaceId}/units/generate`,
        {
          unit_title: decodedTitle,
          unit_description: unitMeta?.description || '',
          learning_objectives: unitMeta?.learning_objectives || [],
          tags: unitMeta?.tags || [],
        },
        { headers }
      );

      if (res.data) {
        setGenerationProgressText('Completed!');
        await fetchUnitContent();
      }
    } catch (err) {
      console.error('Failed to trigger unit content generation:', err);
      alert('Failed to generate unit study content.');
    } finally {
      setGenerating(false);
    }
  };

  // Flashcards navigation
  const handlePrevCard = () => {
    setIsFlipped(false);
    setCardIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };
  const handleNextCard = () => {
    setIsFlipped(false);
    setCardIndex((prev) => (contentData?.flashcards && prev < contentData.flashcards.length - 1 ? prev + 1 : prev));
  };

  // Quiz Option Selector
  const handleSelectQuizOption = async (qIdx, optIdx, correctIdx) => {
    if (quizAnswers[qIdx] !== undefined) return;
    const updatedAnswers = { ...quizAnswers, [qIdx]: optIdx };
    setQuizAnswers(updatedAnswers);

    let updatedScore = 0;
    const updatedQuiz = (contentData?.quiz || []).map((q, idx) => {
      const userAns = updatedAnswers[idx] !== undefined ? updatedAnswers[idx] : (q.user_answer ?? -1);
      if (userAns === q.correct_answer) updatedScore += 1;
      return {
        ...q,
        user_answer: userAns,
      };
    });

    setQuizScore(updatedScore);
    setContentData((prev) => (prev ? { ...prev, quiz: updatedQuiz } : prev));

    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await apiClient.patch(
        `/api/v1/workspaces/${workspaceId}/units/quiz-progress`,
        {
          unit_title: decodedTitle,
          quiz_json: updatedQuiz,
        },
        { headers }
      );
    } catch (err) {
      console.error('Failed to save quiz progress to DB:', err);
    }
  };

  const handleResetQuiz = async () => {
    setQuizAnswers({});
    setQuizScore(0);

    if (!contentData || !contentData.quiz) return;
    const resetQuiz = contentData.quiz.map((q) => ({
      ...q,
      user_answer: -1,
    }));
    setContentData((prev) => (prev ? { ...prev, quiz: resetQuiz } : prev));

    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await apiClient.patch(
        `/api/v1/workspaces/${workspaceId}/units/quiz-progress`,
        {
          unit_title: decodedTitle,
          quiz_json: resetQuiz,
        },
        { headers }
      );
    } catch (err) {
      console.error('Failed to reset quiz progress in DB:', err);
    }
  };

  return (
    <AppLayout
      activeTab="learning"
      workspaceId={workspaceId}
      workspaceName={workspace?.name || null}
    >
      <div className="entry-content">
        {/* Compact Header & Navbar Section */}
        <header
          style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            paddingBottom: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
            borderBottom: '1px solid var(--color-border-subtle)',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/workspaces/${workspaceId}?tab=learning`)}
              style={{
                fontSize: 'var(--font-size-xs)',
                padding: 'var(--space-1.5) var(--space-3)',
                gap: 'var(--space-1.5)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Learning Path
            </button>
            <div style={{ height: '16px', width: '1px', background: 'var(--color-border-subtle)' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2.5)' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  background: 'var(--color-bg-secondary)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                UNIT
              </span>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  lineHeight: 1.25,
                  letterSpacing: '-0.01em',
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                {decodedTitle}
              </h1>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerateContent}
            disabled={generating}
            style={{
              fontSize: 'var(--font-size-xs)',
              padding: 'var(--space-1.5) var(--space-3.5)',
              gap: 'var(--space-1.5)',
            }}
          >
            <i className={`ti ${generating ? 'ti-loader animate-spin' : 'ti-refresh'}`} style={{ fontSize: '0.85rem' }}></i>
            {generating ? 'Regenerating...' : 'Regenerate Study Bundle'}
          </button>
        </header>

        {/* Sub-Navigation Tabs Bar */}
        {contentData && (
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-1.5)',
              marginBottom: 'var(--space-4)',
              paddingBottom: 'var(--space-2)',
              borderBottom: '1px solid var(--color-border-subtle)',
            }}
          >
            <button
              onClick={() => setActiveTab('summary')}
              className={`nav-item ${activeTab === 'summary' ? 'active' : ''}`}
              style={{
                width: 'auto',
                padding: 'var(--space-1.5) var(--space-3.5)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              Summary
            </button>

            <button
              onClick={() => setActiveTab('flashcards')}
              className={`nav-item ${activeTab === 'flashcards' ? 'active' : ''}`}
              style={{
                width: 'auto',
                padding: 'var(--space-1.5) var(--space-3.5)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="14" height="14" rx="2" />
                <path d="M22 9v10a2 2 0 0 1-2 2H8" />
              </svg>
              Flashcards ({contentData.flashcards?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`nav-item ${activeTab === 'quiz' ? 'active' : ''}`}
              style={{
                width: 'auto',
                padding: 'var(--space-1.5) var(--space-3.5)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
              </svg>
              Quiz ({contentData.quiz?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('problems')}
              className={`nav-item ${activeTab === 'problems' ? 'active' : ''}`}
              style={{
                width: 'auto',
                padding: 'var(--space-1.5) var(--space-3.5)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              Problems ({contentData.problems?.length || 0})
            </button>
          </div>
        )}

        {/* Main Content Container */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
            <Spinner size="lg" />
          </div>
        ) : generationProgressText?.startsWith('Failed') ? (
          <div className="island" style={{ padding: 'var(--space-12) var(--space-8)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger-alpha-20)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-4)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>AI generation Failed</h2>
            <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-disabled)', maxWidth: '450px', marginBottom: 'var(--space-6)' }}>
              {generationProgressText}
            </p>
            <button className="btn btn-primary" onClick={handleGenerateContent} style={{ padding: 'var(--space-2-5) var(--space-5)', fontSize: 'var(--font-size-md)', gap: 'var(--space-2)' }}>
              Retry Generation
            </button>
          </div>
        ) : generating ? (
          <div className="island" style={{ padding: 'var(--space-12) var(--space-8)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Spinner size="lg" />
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)' }}>
              {generationProgressText}
            </h3>
            <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-disabled)', maxWidth: '420px' }}>
              Gemini is processing RAG document context and building your interactive Summary, Flashcards, Quiz, and Practice Problems...
            </p>
          </div>
        ) : !contentData ? (
          <div className="island" style={{ padding: 'var(--space-12) var(--space-8)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-4)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2 2 7l10 5 10-5-10-5Z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>Unit Content Not Generated Yet</h2>
            <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-disabled)', maxWidth: '450px', marginBottom: 'var(--space-6)', lineHeight: '1.6' }}>
              Generate a unified study bundle containing a rich summary, interactive flashcards, multiple-choice quiz, and 3 recommended practice problems — powered by RAG context from your workspace documents.
            </p>
            <button className="btn btn-primary" onClick={handleGenerateContent} style={{ padding: 'var(--space-2-5) var(--space-5)', fontSize: 'var(--font-size-md)', gap: 'var(--space-2)' }}>
              Generate Unit Study Bundle
            </button>
          </div>
        ) : (
          <>
            {/* SUB-TAB 1: SUMMARY (Mimics Workspace Summary exact design: no background card container) */}
            {activeTab === 'summary' && contentData.summary && (
              <div id="tab-summary" className="entry-content active">
                {/* Overview */}
                {contentData.summary.overview && (
                  <div className="workspace-overview">
                    <RichMarkdownRenderer content={contentData.summary.overview} />
                  </div>
                )}

                {/* Sections */}
                {contentData.summary.sections && contentData.summary.sections.length > 0 &&
                  contentData.summary.sections.map((sec, idx) => {
                    if (hiddenSummarySections.has(idx)) return null;

                    return (
                      <div className="content-section" key={idx} id={`section-id-${idx + 1}`}>
                        <h2>{sec.title}</h2>
                        <RichMarkdownRenderer
                          content={sec.content}
                          onMermaidError={() => hideSummarySection(idx)}
                        />
                        {sec.diagram && (
                          <div className="diagram-container">
                            <MermaidDiagram source={sec.diagram} title={sec.title} />
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* Key Takeaways */}
                {contentData.summary.key_takeaways && contentData.summary.key_takeaways.length > 0 && (
                  <div className="key-takeaways-box" style={{ marginTop: 'var(--space-6)' }}>
                    <span className="key-takeaways-title">Key Takeaways</span>
                    <ul className="key-takeaways-list">
                      {contentData.summary.key_takeaways.map((item, idx) => (
                        <li key={idx}>
                          <RichMarkdownRenderer content={item} compact />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 2: FLASHCARDS */}
            {activeTab === 'flashcards' && contentData.flashcards && contentData.flashcards.length > 0 && (
              <div style={{ padding: 'var(--space-6) 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-6)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  CARD {cardIndex + 1} OF {contentData.flashcards.length}
                </div>

                {/* Flashcard Card */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  style={{
                    width: '100%',
                    maxWidth: '640px',
                    minHeight: '280px',
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 'var(--radius-ui)',
                    padding: 'var(--space-8) var(--space-9)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: 'var(--elevation-sm)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <span style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-5)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    {isFlipped ? 'Answer' : 'Question'}
                  </span>
                  <h3 style={{ fontSize: isFlipped ? '1.1rem' : '1.25rem', fontWeight: isFlipped ? 400 : 500, color: isFlipped ? 'var(--color-text-secondary)' : 'var(--color-text-primary)', lineHeight: '1.6', margin: 0, fontFamily: isFlipped ? 'inherit' : 'var(--font-display)' }}>
                    {isFlipped
                      ? contentData.flashcards[cardIndex]?.back
                      : contentData.flashcards[cardIndex]?.front}
                  </h3>
                  <p style={{ marginTop: 'var(--space-6)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Click card to flip ↺
                  </p>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handlePrevCard}
                    disabled={cardIndex === 0}
                    style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-2) var(--space-4-5)', gap: 'var(--space-2)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    Previous
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleNextCard}
                    disabled={cardIndex === contentData.flashcards.length - 1}
                    style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-2) var(--space-4-5)', gap: 'var(--space-2)' }}
                  >
                    Next
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: QUIZ */}
            {activeTab === 'quiz' && contentData.quiz && contentData.quiz.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                {/* Score Header Island */}
                <div
                  className="island"
                  style={{
                    padding: 'var(--space-4) var(--space-6)',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    flexWrap: 'wrap',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3-5)' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-muted)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      QUIZ PROGRESS
                    </span>
                    <div style={{ height: '18px', width: '1px', background: 'var(--color-border-subtle)' }}></div>
                    <span
                      style={{
                        fontSize: 'var(--font-size-base)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      Score:{' '}
                      <strong style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-lg)' }}>
                        {quizScore}
                      </strong>{' '}
                      / {contentData.quiz.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleResetQuiz}
                    style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-1-5) var(--space-3.5)', gap: 'var(--space-1-5)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    Reset Quiz
                  </button>
                </div>

                {/* Question Cards List */}
                {contentData.quiz.map((q, qIdx) => {
                  const answeredOpt = quizAnswers[qIdx];
                  const isAnswered = answeredOpt !== undefined;

                  return (
                    <div
                      key={qIdx}
                      className="island"
                      style={{
                        padding: 'var(--space-6) var(--space-7)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-5)',
                      }}
                    >
                      {/* Question Title Header */}
                      <div>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 'var(--font-weight-bold)',
                            color: 'var(--color-primary)',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            display: 'block',
                            marginBottom: 'var(--space-2)',
                          }}
                        >
                          QUESTION {qIdx + 1} OF {contentData.quiz.length}
                        </span>
                        <h3
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 'var(--font-size-2xl)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: 'var(--color-text-primary)',
                            lineHeight: 'var(--line-height-snug)',
                            margin: 0,
                          }}
                        >
                          {q.question}
                        </h3>
                      </div>

                      {/* Options Grid */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {q.options.map((opt, optIdx) => {
                          const isCorrectOpt = optIdx === q.correct_answer;
                          const isUserSelected = optIdx === answeredOpt;

                          let customStyle = {
                            width: '100%',
                            padding: 'var(--space-3-5) var(--space-4-5)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-base)',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: isAnswered ? 'default' : 'pointer',
                            transition: 'var(--transition-fast)',
                          };

                          if (isAnswered) {
                            if (isCorrectOpt) {
                              customStyle.background = 'var(--color-success-subtle)';
                              customStyle.borderColor = 'var(--color-success-alpha-20)';
                              customStyle.color = 'var(--color-success-text)';
                              customStyle.fontWeight = 'var(--font-weight-semibold)';
                            } else if (isUserSelected) {
                              customStyle.background = 'var(--color-danger-subtle)';
                              customStyle.borderColor = 'var(--color-danger-alpha-20)';
                              customStyle.color = 'var(--color-danger-text)';
                            } else {
                              customStyle.color = 'var(--color-text-disabled)';
                              customStyle.opacity = 0.6;
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              className="btn btn-secondary"
                              style={customStyle}
                              onClick={() => handleSelectQuizOption(qIdx, optIdx, q.correct_answer)}
                              disabled={isAnswered}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3.5)' }}>
                                <span
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 'var(--font-weight-bold)',
                                    opacity: 0.8,
                                  }}
                                >
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span style={{ lineHeight: 'var(--line-height-normal)' }}>{opt}</span>
                              </div>

                              {isAnswered && isCorrectOpt && (
                                <span
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 'var(--font-weight-bold)',
                                    color: 'var(--color-success-text)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  ✓ Correct
                                </span>
                              )}
                              {isAnswered && isUserSelected && !isCorrectOpt && (
                                <span
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 'var(--font-weight-bold)',
                                    color: 'var(--color-danger-text)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  ✗ Incorrect
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Section */}
                      {isAnswered && (
                        <div
                          style={{
                            marginTop: 'var(--space-2)',
                            paddingTop: 'var(--space-4)',
                            borderTop: '1px solid var(--color-border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-1-5)',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 'var(--font-size-xs)',
                              fontWeight: 'var(--font-weight-bold)',
                              color: answeredOpt === q.correct_answer ? 'var(--color-success-text)' : 'var(--color-danger-text)',
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {answeredOpt === q.correct_answer ? '✓ CORRECT ANSWER' : '✗ INCORRECT ANSWER'}
                          </span>
                          <p
                            style={{
                              fontSize: 'var(--font-size-base)',
                              color: 'var(--color-text-secondary)',
                              lineHeight: 'var(--line-height-relaxed)',
                              margin: 0,
                            }}
                          >
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* SUB-TAB 4: PROBLEMS */}
            {activeTab === 'problems' && contentData.problems && contentData.problems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {contentData.problems.map((prob, pIdx) => {
                  const isEasy = prob.difficulty?.toLowerCase() === 'easy';
                  const isMedium = prob.difficulty?.toLowerCase() === 'medium';
                  const diffTextColor = isEasy ? 'var(--color-success-text)' : isMedium ? 'var(--color-warning-text)' : 'var(--color-danger-text)';
                  const diffBgColor = isEasy ? 'var(--color-success-subtle)' : isMedium ? 'var(--color-warning-subtle)' : 'var(--color-danger-subtle)';
                  const diffBorderColor = isEasy ? 'var(--color-success-alpha-20)' : isMedium ? 'var(--color-warning-alpha-20)' : 'var(--color-danger-alpha-20)';

                  return (
                    <div
                      key={pIdx}
                      className="island"
                      style={{
                        padding: 'var(--space-5-5) var(--space-6)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-3-5)',
                      }}
                    >
                      {/* Header: Title, Platform, Difficulty, Solve Button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2-5)', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
                            {prob.title}
                          </h4>
                          <span
                            style={{
                              fontSize: 'var(--font-size-xs)',
                              fontWeight: 'var(--font-weight-bold)',
                              padding: 'var(--space-0-5) var(--space-2-5)',
                              borderRadius: 'var(--radius-xs)',
                              background: 'var(--color-primary-subtle)',
                              color: 'var(--color-primary)',
                              border: '1px solid var(--color-primary-alpha-20)',
                            }}
                          >
                            {prob.platform}
                          </span>
                          <span
                            style={{
                              fontSize: 'var(--font-size-xs)',
                              fontWeight: 'var(--font-weight-bold)',
                              padding: 'var(--space-0-5) var(--space-2-5)',
                              borderRadius: 'var(--radius-xs)',
                              background: diffBgColor,
                              color: diffTextColor,
                              border: `1px solid ${diffBorderColor}`,
                            }}
                          >
                            {prob.difficulty}
                          </span>
                        </div>

                        {prob.url && (
                          <a
                            href={prob.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ fontSize: 'var(--font-size-md)', padding: 'var(--space-1-5) var(--space-4)', gap: 'var(--space-1-5)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                          >
                            Solve Problem
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        )}
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.6' }}>
                        {prob.description}
                      </p>

                      {/* Concepts */}
                      {prob.concepts && prob.concepts.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-disabled)' }}>Concepts:</span>
                          {prob.concepts.map((c, cIdx) => (
                            <span
                              key={cIdx}
                              style={{
                                fontSize: 'var(--font-size-xs)',
                                padding: 'var(--space-0-5) var(--space-2-5)',
                                borderRadius: 'var(--radius-xs)',
                                background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border-subtle)',
                              }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Relevance note */}
                      {prob.relevance && (
                        <div
                          style={{
                            background: 'var(--color-primary-subtle)',
                            borderLeft: '3px solid var(--color-primary)',
                            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                            padding: 'var(--space-2-5) var(--space-3-5)',
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-secondary)',
                            lineHeight: '1.5',
                          }}
                        >
                          <strong style={{ color: 'var(--color-primary)' }}>Why it is relevant: </strong>
                          {prob.relevance}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};
