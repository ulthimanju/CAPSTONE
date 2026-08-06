import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Spinner } from '../components/ui/Spinner';
import { RichMarkdownRenderer } from '../components/ui/RichMarkdownRenderer';
import { useAuth } from '../hooks/useAuth';

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

  // Load workspace & unit metadata
  useEffect(() => {
    if (!workspaceId) return;
    fetchWorkspaceAndUnit();
    fetchUnitContent();
  }, [workspaceId, unitTitle]);

  // Listen to SSE events for LearningUnitGeneration
  useEffect(() => {
    if (!workspaceId || !decodedTitle) return;
    const eventSource = new EventSource('/api/v1/notifications/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.event_name === 'LearningUnitGeneration' &&
          data.workspace_id === workspaceId &&
          data.unit_title === decodedTitle
        ) {
          if (data.status === 'QUEUED') setGenerationProgressText('Queued...');
          else if (data.status === 'STARTED') setGenerationProgressText('Retrieving RAG document context (~1K tokens)...');
          else if (data.status === 'IN_PROGRESS') setGenerationProgressText('Generating Summary, Flashcards & Quiz with Gemini in 1 pass...');
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
        console.error('Error parsing SSE event in LearningUnitDetailPage:', e);
      }
    };

    return () => eventSource.close();
  }, [workspaceId, decodedTitle]);

  const fetchWorkspaceAndUnit = async () => {
    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const wsRes = await axios.get(`/api/v1/workspaces/${workspaceId}`, { headers });
      setWorkspace(wsRes.data);

      const lpRes = await axios.get(`/api/v1/workspaces/${workspaceId}/learning-path`, { headers });
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
      const res = await axios.get(
        `/api/v1/workspaces/${workspaceId}/units/content?unit_title=${encodeURIComponent(decodedTitle)}`,
        { headers }
      );
      if (res.data && res.data.content) {
        setContentData(res.data.content);
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
      setGenerationProgressText('Starting generation pipeline...');
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await axios.post(
        `/api/v1/ai/workspaces/${workspaceId}/units/generate`,
        {
          unit_title: decodedTitle,
          unit_description: unitMeta?.description || '',
          learning_objectives: unitMeta?.learning_objectives || [],
          tags: unitMeta?.tags || [],
        },
        { headers }
      );
    } catch (err) {
      console.error('Failed to trigger unit content generation:', err);
      alert('Failed to generate unit study content.');
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
  const handleSelectQuizOption = (qIdx, optIdx, correctIdx) => {
    if (quizAnswers[qIdx] !== undefined) return;
    const updated = { ...quizAnswers, [qIdx]: optIdx };
    setQuizAnswers(updated);
    if (optIdx === correctIdx) {
      setQuizScore((prev) => prev + 1);
    }
  };

  const handleResetQuiz = () => {
    setQuizAnswers({});
    setQuizScore(0);
  };

  return (
    <div style={{ height: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ============ TOPBAR ============ */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-1)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        {/* Left: Back Button & Workspace Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
          <button
            className="btn"
            style={{ fontSize: '13px', padding: '7px 14px', gap: '6px', borderRadius: '8px', flexShrink: 0 }}
            onClick={() => navigate(`/workspaces/${workspaceId}`)}
          >
            <i className="ti ti-arrow-left"></i> Back to Workspace
          </button>
          <div style={{ height: '20px', width: '1px', background: 'var(--border)', flexShrink: 0 }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--mono)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              {workspace?.name || 'Workspace'} • Learning Unit
            </span>
            <h1 style={{ fontSize: '15px', fontWeight: '600', margin: 0, color: 'var(--text)', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {decodedTitle}
            </h1>
          </div>
        </div>

        {/* Right: Segmented Sub-Tabs + Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          {contentData && (
            <div style={{ display: 'flex', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              <button
                onClick={() => setActiveTab('summary')}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: activeTab === 'summary' ? 'var(--bg-1)' : 'transparent',
                  border: activeTab === 'summary' ? '1px solid var(--border-strong)' : '1px solid transparent',
                  borderRadius: '6px',
                  color: activeTab === 'summary' ? 'var(--text)' : 'var(--text-3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'summary' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="ti ti-file-text"></i> Summary
              </button>

              <button
                onClick={() => setActiveTab('flashcards')}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: activeTab === 'flashcards' ? 'var(--bg-1)' : 'transparent',
                  border: activeTab === 'flashcards' ? '1px solid var(--border-strong)' : '1px solid transparent',
                  borderRadius: '6px',
                  color: activeTab === 'flashcards' ? 'var(--text)' : 'var(--text-3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'flashcards' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="ti ti-cards"></i> Flashcards ({contentData.flashcards?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('quiz')}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: activeTab === 'quiz' ? 'var(--bg-1)' : 'transparent',
                  border: activeTab === 'quiz' ? '1px solid var(--border-strong)' : '1px solid transparent',
                  borderRadius: '6px',
                  color: activeTab === 'quiz' ? 'var(--text)' : 'var(--text-3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'quiz' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="ti ti-help-circle"></i> Quiz ({contentData.quiz?.length || 0})
              </button>
            </div>
          )}

          {contentData && (
            <button
              className="btn"
              style={{ fontSize: '12px', padding: '7px 14px', gap: '6px', color: 'var(--text-2)', borderColor: 'var(--border-strong)' }}
              onClick={handleGenerateContent}
              disabled={generating}
            >
              <i className="ti ti-rotate-clockwise"></i> {generating ? 'Regenerating...' : 'Regenerate'}
            </button>
          )}
        </div>
      </header>

      {/* ============ MAIN CONTENT AREA ============ */}
      <main style={{ flex: 1, overflowY: 'auto', maxWidth: '960px', width: '100%', margin: '0 auto', padding: '24px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
            <Spinner size="lg" />
          </div>
        ) : generating ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', textAlign: 'center', padding: '2rem', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <Spinner size="lg" />
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
              {generationProgressText}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: '420px' }}>
              Gemini is retrieving ~1K RAG document context tokens and generating Summary, Flashcards & Quiz in 1 single pass...
            </p>
          </div>
        ) : !contentData ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '45vh', textAlign: 'center', padding: '3rem 2rem', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '1.25rem' }}>
              <i className="ti ti-sparkles"></i>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '0.5rem' }}>Unit Content Not Generated Yet</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: '450px', marginBottom: '1.75rem', lineHeight: '1.6' }}>
              Generate a unified study bundle containing a rich summary, interactive flashcards, and a multiple-choice quiz — powered by RAG context from your workspace documents.
            </p>
            <button className="btn btn-primary" onClick={handleGenerateContent} style={{ padding: '10px 24px', fontSize: '14px' }}>
              <i className="ti ti-bolt"></i> Generate Unit Study Bundle
            </button>
          </div>
        ) : (
          <>
            {/* SUB-TAB 1: SUMMARY */}
            {activeTab === 'summary' && contentData.summary && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Overview */}
                {contentData.summary.overview && (
                  <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--accent)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="ti ti-notes"></i> Overview
                    </h3>
                    <RichMarkdownRenderer content={contentData.summary.overview} />
                  </div>
                )}

                {/* Key Takeaways */}
                {contentData.summary.key_takeaways && contentData.summary.key_takeaways.length > 0 && (
                  <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#3b82f6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="ti ti-bulb"></i> Key Takeaways
                    </h3>
                    <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '2px', margin: 0 }}>
                      {contentData.summary.key_takeaways.map((item, idx) => (
                        <li key={idx} style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.4' }}>
                          <RichMarkdownRenderer content={item} compact />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sections */}
                {contentData.summary.sections && contentData.summary.sections.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {contentData.summary.sections.map((sec, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                          {sec.title}
                        </h3>
                        <RichMarkdownRenderer content={sec.content} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 2: FLASHCARDS */}
            {activeTab === 'flashcards' && contentData.flashcards && contentData.flashcards.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                  Card {cardIndex + 1} of {contentData.flashcards.length}
                </div>

                {/* Flashcard Card */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  style={{
                    width: '100%',
                    maxWidth: '600px',
                    minHeight: '260px',
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '14px',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justify: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                    transition: 'transform 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <span style={{ position: 'absolute', top: '14px', right: '16px', fontSize: '11px', color: 'var(--accent)', fontWeight: '600', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                    {isFlipped ? 'Answer' : 'Question'}
                  </span>
                  <h3 style={{ fontSize: isFlipped ? '16px' : '18px', fontWeight: isFlipped ? '400' : '600', color: isFlipped ? 'var(--text-2)' : 'var(--text)', lineHeight: '1.6', margin: 0 }}>
                    {isFlipped
                      ? contentData.flashcards[cardIndex]?.back
                      : contentData.flashcards[cardIndex]?.front}
                  </h3>
                  <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-3)' }}>
                    Click card to flip ↺
                  </p>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '14px' }}>
                  <button
                    className="btn"
                    onClick={handlePrevCard}
                    disabled={cardIndex === 0}
                    style={{ fontSize: '13px', padding: '8px 18px' }}
                  >
                    <i className="ti ti-chevron-left"></i> Previous
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleNextCard}
                    disabled={cardIndex === contentData.flashcards.length - 1}
                    style={{ fontSize: '13px', padding: '8px 18px' }}
                  >
                    Next <i className="ti ti-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: QUIZ */}
            {activeTab === 'quiz' && contentData.quiz && contentData.quiz.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: '600' }}>
                    Score: {quizScore} / {contentData.quiz.length}
                  </span>
                  <button
                    className="btn"
                    onClick={handleResetQuiz}
                    style={{ fontSize: '12px', padding: '6px 12px', color: 'var(--text-3)' }}
                  >
                    <i className="ti ti-rotate-clockwise"></i> Reset Quiz
                  </button>
                </div>

                {contentData.quiz.map((q, qIdx) => {
                  const answeredOpt = quizAnswers[qIdx];
                  const isAnswered = answeredOpt !== undefined;
                  return (
                    <div key={qIdx} style={{ background: 'var(--bg-1)', border: '1px solid var(--border-strong)', borderRadius: '12px', padding: '20px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px', display: 'flex', gap: '10px' }}>
                        <span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>Q{qIdx + 1}.</span> {q.question}
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                        {q.options.map((opt, optIdx) => {
                          let optionStyle = {
                            padding: '12px 16px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-2)',
                            color: 'var(--text-2)',
                            cursor: isAnswered ? 'default' : 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.15s ease',
                          };

                          if (isAnswered) {
                            if (optIdx === q.correct_answer) {
                              optionStyle.border = '1px solid var(--accent)';
                              optionStyle.background = 'var(--accent-bg)';
                              optionStyle.color = 'var(--accent)';
                              optionStyle.fontWeight = '600';
                            } else if (optIdx === answeredOpt) {
                              optionStyle.border = '1px solid var(--danger)';
                              optionStyle.background = 'rgba(239, 68, 68, 0.1)';
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
                              <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', opacity: 0.7 }}>
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {isAnswered && (
                        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.5' }}>
                          <strong style={{ color: answeredOpt === q.correct_answer ? 'var(--accent)' : 'var(--danger)', display: 'block', marginBottom: '4px' }}>
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
      </main>
    </div>
  );
};
