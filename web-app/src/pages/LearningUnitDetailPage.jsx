import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api/client';
import { tokenStorage } from '../lib/tokenStorage';
import { Spinner } from '../components/ui/Spinner';
import { RichMarkdownRenderer } from '../components/ui/RichMarkdownRenderer';
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
          else if (data.status === 'IN_PROGRESS') setGenerationProgressText('Generating Summary, Flashcards & Quiz with Gemini...');
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
      setGenerationProgressText('Generating Summary, Flashcards & Quiz with Gemini...');
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 1. Header Island Banner */}
        <div className="island" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              className="btn"
              onClick={() => navigate(`/workspaces/${workspaceId}`)}
              style={{ fontSize: '13px', padding: '6px 12px', gap: '6px', borderRadius: '8px' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Workspace
            </button>
            <div style={{ height: '20px', width: '1px', background: 'var(--border-soft)' }}></div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                LEARNING UNIT
              </span>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', margin: 0, lineHeight: '1.3' }}>
                {decodedTitle}
              </h2>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleGenerateContent}
            disabled={generating}
            style={{ fontSize: '12.5px', padding: '7px 14px', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            {generating ? 'Regenerating...' : 'Regenerate Study Bundle'}
          </button>
        </div>

        {/* 2. Sub-Navigation Tabs Bar */}
        {contentData && (
          <div className="island" style={{ padding: '8px 12px', display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('summary')}
              className={`nav-item ${activeTab === 'summary' ? 'active' : ''}`}
              style={{ width: 'auto', padding: '8px 16px', borderRadius: '8px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              Summary
            </button>

            <button
              onClick={() => setActiveTab('flashcards')}
              className={`nav-item ${activeTab === 'flashcards' ? 'active' : ''}`}
              style={{ width: 'auto', padding: '8px 16px', borderRadius: '8px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="14" height="14" rx="2" />
                <path d="M22 9v10a2 2 0 0 1-2 2H8" />
              </svg>
              Flashcards ({contentData.flashcards?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`nav-item ${activeTab === 'quiz' ? 'active' : ''}`}
              style={{ width: 'auto', padding: '8px 16px', borderRadius: '8px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
              </svg>
              Quiz ({contentData.quiz?.length || 0})
            </button>
          </div>
        )}

        {/* 3. Main Content Container */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner size="lg" />
          </div>
        ) : generating ? (
          <div className="island" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Spinner size="lg" />
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
              {generationProgressText}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-faint)', maxWidth: '420px' }}>
              Gemini is processing RAG document context and building your interactive Summary, Flashcards, and Quiz...
            </p>
          </div>
        ) : !contentData ? (
          <div className="island" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--island-2)', border: '1px solid var(--border-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '1rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2 2 7l10 5 10-5-10-5Z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '0.5rem' }}>Unit Content Not Generated Yet</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-faint)', maxWidth: '450px', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Generate a unified study bundle containing a rich summary, interactive flashcards, and a multiple-choice quiz — powered by RAG context from your workspace documents.
            </p>
            <button className="btn btn-primary" onClick={handleGenerateContent} style={{ padding: '10px 20px', fontSize: '13.5px', gap: '8px' }}>
              Generate Unit Study Bundle
            </button>
          </div>
        ) : (
          <>
            {/* SUB-TAB 1: SUMMARY */}
            {activeTab === 'summary' && contentData.summary && (
              <div className="island" style={{ padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Overview */}
                {contentData.summary.overview && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Overview
                    </h3>
                    <RichMarkdownRenderer content={contentData.summary.overview} />
                  </div>
                )}

                {/* Key Takeaways */}
                {contentData.summary.key_takeaways && contentData.summary.key_takeaways.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#4D7CF5', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Key Takeaways
                    </h3>
                    <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                      {contentData.summary.key_takeaways.map((item, idx) => (
                        <li key={idx} style={{ fontSize: '13.5px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                          <RichMarkdownRenderer content={item} compact />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sections */}
                {contentData.summary.sections && contentData.summary.sections.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', borderTop: '1px solid var(--border-soft)', paddingTop: '20px' }}>
                    {contentData.summary.sections.map((sec, idx) => {
                      if (hiddenSummarySections.has(idx)) return null;

                      return (
                        <div key={idx}>
                          <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '10px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '6px' }}>
                            {sec.title}
                          </h4>
                          <RichMarkdownRenderer
                            content={sec.content}
                            onMermaidError={() => hideSummarySection(idx)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 2: FLASHCARDS */}
            {activeTab === 'flashcards' && contentData.flashcards && contentData.flashcards.length > 0 && (
              <div className="island" style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  CARD {cardIndex + 1} OF {contentData.flashcards.length}
                </div>

                {/* Flashcard Card */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  style={{
                    width: '100%',
                    maxWidth: '620px',
                    minHeight: '260px',
                    background: 'var(--island-2)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: 'var(--radius)',
                    padding: '36px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justify: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow)',
                    transition: 'transform 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <span style={{ position: 'absolute', top: '16px', right: '18px', fontSize: '11px', color: 'var(--accent)', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    {isFlipped ? 'Answer' : 'Question'}
                  </span>
                  <h3 style={{ fontSize: isFlipped ? '16px' : '18px', fontWeight: isFlipped ? '500' : '600', color: isFlipped ? 'var(--text-dim)' : 'var(--text)', lineHeight: '1.6', margin: 0 }}>
                    {isFlipped
                      ? contentData.flashcards[cardIndex]?.back
                      : contentData.flashcards[cardIndex]?.front}
                  </h3>
                  <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-faint)' }}>
                    Click card to flip ↺
                  </p>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="btn"
                    onClick={handlePrevCard}
                    disabled={cardIndex === 0}
                    style={{ fontSize: '13px', padding: '8px 18px', gap: '6px' }}
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
                    style={{ fontSize: '13px', padding: '8px 18px', gap: '6px' }}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="island" style={{ padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: '700' }}>
                    Score: {quizScore} / {contentData.quiz.length}
                  </span>
                  <button
                    className="btn"
                    onClick={handleResetQuiz}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Reset Quiz
                  </button>
                </div>

                {contentData.quiz.map((q, qIdx) => {
                  const answeredOpt = quizAnswers[qIdx];
                  const isAnswered = answeredOpt !== undefined;
                  return (
                    <div key={qIdx} className="island" style={{ padding: '22px 24px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px', display: 'flex', gap: '10px' }}>
                        <span style={{ color: 'var(--accent)', fontWeight: '700' }}>Q{qIdx + 1}.</span> {q.question}
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                        {q.options.map((opt, optIdx) => {
                          let optionStyle = {
                            padding: '12px 16px',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            border: '1px solid var(--border-soft)',
                            background: 'var(--island-2)',
                            color: 'var(--text-dim)',
                            cursor: isAnswered ? 'default' : 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.15s ease',
                          };

                          if (isAnswered) {
                            if (optIdx === q.correct_answer) {
                              optionStyle.border = '1px solid rgba(62, 207, 142, 0.4)';
                              optionStyle.background = 'rgba(62, 207, 142, 0.1)';
                              optionStyle.color = '#3ecf8e';
                              optionStyle.fontWeight = '600';
                            } else if (optIdx === answeredOpt) {
                              optionStyle.border = '1px solid rgba(226, 87, 76, 0.4)';
                              optionStyle.background = 'rgba(226, 87, 76, 0.1)';
                              optionStyle.color = 'var(--danger)';
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              style={optionStyle}
                              onClick={() => handleSelectQuizOption(qIdx, optIdx, q.correct_answer)}
                              disabled={isAnswered}
                            >
                              <span style={{ fontSize: '12px', opacity: 0.7, fontWeight: '700' }}>
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {isAnswered && (
                        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-soft)', fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                          <strong style={{ color: answeredOpt === q.correct_answer ? '#3ecf8e' : 'var(--danger)', display: 'block', marginBottom: '4px' }}>
                            {answeredOpt === q.correct_answer ? '✓ Correct!' : '✗ Incorrect'}
                          </strong>
                          {q.explanation}
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
