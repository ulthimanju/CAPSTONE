import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api/client';
import { tokenStorage } from '../../lib/tokenStorage';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { useAuth } from '../../hooks/useAuth';

export const LearningUnitModal = ({ open, onClose, unit, workspaceId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'flashcards' | 'quiz'
  const [contentData, setContentData] = useState(null); // { summary, flashcards, quiz }
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationProgressText, setGenerationProgressText] = useState('');

  // Flashcards state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState({}); // { [qIdx]: selectedOptionIdx }
  const [quizScore, setQuizScore] = useState(0);

  // Indices of summary sections whose mermaid diagram(s) failed to render.
  // Local UI-only concern; resets whenever contentData changes (new unit
  // opened, content regenerated) so a fixed regeneration isn't stuck hidden.
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

  // Fetch unit content on open
  useEffect(() => {
    if (!open || !unit || !workspaceId) return;
    fetchUnitContent();
  }, [open, unit, workspaceId]);

  // Listen to SSE events for LearningUnitGeneration
  useEffect(() => {
    if (!open || !workspaceId || !unit) return;
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
          data.unit_title === unit.title
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
  }, [open, workspaceId, unit]);

  const fetchUnitContent = async () => {
    try {
      setLoading(true);
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      const res = await apiClient.get(
        `/api/v1/workspaces/${workspaceId}/units/content?unit_title=${encodeURIComponent(unit.title)}`,
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
          unit_title: unit.title,
          unit_description: unit.description || '',
          learning_objectives: unit.learning_objectives || [],
          tags: unit.tags || [],
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

  // Quiz Option Selector (Saves user_answer to DB)
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
        user_answer: userAns
      };
    });

    setQuizScore(updatedScore);
    setContentData((prev) => (prev ? { ...prev, quiz: updatedQuiz } : prev));

    try {
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await apiClient.patch(`/api/v1/workspaces/${workspaceId}/units/quiz-progress`, {
        unit_title: unit.title,
        quiz_json: updatedQuiz,
      }, { headers });
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
      await apiClient.patch(`/api/v1/workspaces/${workspaceId}/units/quiz-progress`, {
        unit_title: unit.title,
        quiz_json: resetQuiz,
      }, { headers });
    } catch (err) {
      console.error('Failed to reset quiz progress in DB:', err);
    }
  };

  if (!open || !unit) return null;

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent size="xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)', borderRadius: 'var(--radius-xl)', maxWidth: 'var(--dimension-modal-xl)', maxHeight: '90vh', overflow: 'hidden' }}>
        {/* Header */}
        <ModalHeader
          title={unit.title}
          description={unit.description || 'Study Unit Content'}
          action={
            contentData && (
              <button
                className="btn"
                style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-1) var(--space-2-5)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border-default)' }}
                onClick={handleGenerateContent}
                disabled={generating}
              >
                <i className="ti ti-rotate-clockwise"></i> {generating ? 'Regenerating...' : 'Regenerate'}
              </button>
            )
          }
        />

        {/* Sub-tabs Navigation */}
        {contentData && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--color-border-subtle)', padding: '0 var(--space-5)', background: 'var(--color-bg-surface)' }}>
            <button
              className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
              style={{ padding: 'var(--space-2-5) var(--space-4)', fontSize: 'var(--font-size-md)', borderBottom: activeTab === 'summary' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'summary' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontWeight: 'var(--font-weight-semibold)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <i className="ti ti-file-text" style={{ marginRight: 'var(--space-1-5)' }}></i> Summary
            </button>

            <button
              className={`tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
              onClick={() => setActiveTab('flashcards')}
              style={{ padding: 'var(--space-2-5) var(--space-4)', fontSize: 'var(--font-size-md)', borderBottom: activeTab === 'flashcards' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'flashcards' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontWeight: 'var(--font-weight-semibold)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <i className="ti ti-cards" style={{ marginRight: 'var(--space-1-5)' }}></i> Flashcards ({contentData.flashcards?.length || 0})
            </button>

            <button
              className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
              onClick={() => setActiveTab('quiz')}
              style={{ padding: 'var(--space-2-5) var(--space-4)', fontSize: 'var(--font-size-md)', borderBottom: activeTab === 'quiz' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'quiz' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontWeight: 'var(--font-weight-semibold)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <i className="ti ti-help-circle" style={{ marginRight: 'var(--space-1-5)' }}></i> Quiz ({contentData.quiz?.length || 0})
            </button>

            <button
              className={`tab-btn ${activeTab === 'problems' ? 'active' : ''}`}
              onClick={() => setActiveTab('problems')}
              style={{ padding: 'var(--space-2-5) var(--space-4)', fontSize: 'var(--font-size-md)', borderBottom: activeTab === 'problems' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'problems' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontWeight: 'var(--font-weight-semibold)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <i className="ti ti-code" style={{ marginRight: 'var(--space-1-5)' }}></i> Problems ({contentData.problems?.length || 0})
            </button>
          </div>
        )}

        {/* Body Content */}
        <ModalBody className="py-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
              <Spinner size="lg" />
            </div>
          ) : generationProgressText?.startsWith('Failed') ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '35vh', textAlign: 'center', padding: 'var(--space-8)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger-alpha-20)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-5)' }}>
                <i className="ti ti-alert-triangle"></i>
              </div>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>AI generation Failed</h3>
              <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-muted)', maxWidth: '420px', marginBottom: 'var(--space-6)', lineHeight: '1.5' }}>
                {generationProgressText}
              </p>
              <button className="btn btn-primary" onClick={handleGenerateContent} style={{ padding: 'var(--space-2-5) var(--space-5)', fontSize: 'var(--font-size-md)' }}>
                <i className="ti ti-rotate-clockwise"></i> Retry Generation
              </button>
            </div>
          ) : generating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', textAlign: 'center', padding: 'var(--space-8)' }}>
              <Spinner size="lg" />
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)' }}>
                {generationProgressText}
              </h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Gemini is synthesizing Summary, Flashcards, Quiz & Problems from RAG document context in 1 pass...</p>
            </div>
          ) : !contentData ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '35vh', textAlign: 'center', padding: 'var(--space-8)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-5)' }}>
                <i className="ti ti-sparkles"></i>
              </div>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>Unit Content Not Generated Yet</h3>
              <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-muted)', maxWidth: '420px', marginBottom: 'var(--space-6)', lineHeight: '1.5' }}>
                Generate a unified study bundle containing a rich summary, interactive flashcards, quiz, and practice problems — powered by RAG context from your workspace documents in 1 single pass.
              </p>
              <button className="btn btn-primary" onClick={handleGenerateContent} style={{ padding: 'var(--space-2-5) var(--space-5)', fontSize: 'var(--font-size-md)' }}>
                <i className="ti ti-bolt"></i> Generate Unit Study Bundle
              </button>
            </div>
          ) : (
            <>
              {/* SUB-TAB 1: SUMMARY */}
              {activeTab === 'summary' && contentData.summary && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                  {/* Overview */}
                  {contentData.summary.overview && (
                    <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                      <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-primary)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1-5)' }}>
                        <i className="ti ti-notes"></i> Overview
                      </h4>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{contentData.summary.overview}</div>
                    </div>
                  )}

                  {/* Key Takeaways */}
                  {contentData.summary.key_takeaways && contentData.summary.key_takeaways.length > 0 && (
                    <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                      <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-primary)', marginBottom: 'var(--space-2-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-1-5)' }}>
                        <i className="ti ti-bulb"></i> Key Takeaways
                      </h4>
                      <ul style={{ paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', margin: 0 }}>
                        {contentData.summary.key_takeaways.map((item, idx) => (
                          <li key={idx} style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sections */}
                  {contentData.summary.sections && contentData.summary.sections.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3-5)' }}>
                      {contentData.summary.sections.map((sec, idx) => {
                        if (hiddenSummarySections.has(idx)) return null;

                        return (
                          <div key={idx} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-2-5)', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-1-5)' }}>
                              {sec.title}
                            </h4>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{sec.content}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 2: FLASHCARDS */}
              {activeTab === 'flashcards' && contentData.flashcards && contentData.flashcards.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)', padding: 'var(--space-4) 0' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Card {cardIndex + 1} of {contentData.flashcards.length}
                  </div>

                  {/* Flashcard Component */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    style={{
                      width: '100%',
                      maxWidth: '540px',
                      minHeight: '220px',
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--radius-xl)',
                      padding: 'var(--space-6)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: 'var(--elevation-md)',
                      transition: 'transform 0.2s ease, border-color 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', top: 'var(--space-3)', right: 'var(--space-3-5)', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                      {isFlipped ? 'Answer' : 'Question'}
                    </span>
                    <h3 style={{ fontSize: isFlipped ? 'var(--font-size-base)' : 'var(--font-size-lg)', fontWeight: isFlipped ? 'var(--font-weight-normal)' : 'var(--font-weight-semibold)', color: isFlipped ? 'var(--color-text-secondary)' : 'var(--color-text-primary)', lineHeight: '1.6', margin: 0 }}>
                      {isFlipped
                        ? contentData.flashcards[cardIndex]?.back
                        : contentData.flashcards[cardIndex]?.front}
                    </h3>
                    <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      Click card to flip ↺
                    </p>
                  </div>

                  {/* Controls */}
                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button
                      className="btn"
                      onClick={handlePrevCard}
                      disabled={cardIndex === 0}
                      style={{ fontSize: 'var(--font-size-md)', padding: 'var(--space-2) var(--space-4)' }}
                    >
                      <i className="ti ti-chevron-left"></i> Previous
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleNextCard}
                      disabled={cardIndex === contentData.flashcards.length - 1}
                      style={{ fontSize: 'var(--font-size-md)', padding: 'var(--space-2) var(--space-4)' }}
                    >
                      Next <i className="ti ti-chevron-right"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: QUIZ */}
              {activeTab === 'quiz' && contentData.quiz && contentData.quiz.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-3)' }}>
                    <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-semibold)' }}>
                      Score: {quizScore} / {contentData.quiz.length}
                    </span>
                    <button
                      className="btn"
                      onClick={handleResetQuiz}
                      style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-1) var(--space-2-5)', color: 'var(--color-text-muted)' }}
                    >
                      <i className="ti ti-rotate-clockwise"></i> Reset Quiz
                    </button>
                  </div>

                  {contentData.quiz.map((q, qIdx) => {
                    const answeredOpt = quizAnswers[qIdx];
                    const isAnswered = answeredOpt !== undefined;
                    return (
                      <div key={qIdx} style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4-5)' }}>
                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-3-5)', display: 'flex', gap: 'var(--space-2)' }}>
                          <span style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>Q{qIdx + 1}.</span> {q.question}
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                          {q.options.map((opt, optIdx) => {
                            let optionStyle = {
                              padding: 'var(--space-2-5) var(--space-3-5)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 'var(--font-size-md)',
                              border: '1px solid var(--color-border-default)',
                              background: 'var(--color-bg-secondary)',
                              color: 'var(--color-text-secondary)',
                              cursor: isAnswered ? 'default' : 'pointer',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-2-5)',
                              transition: 'all 0.15s ease',
                            };

                            if (isAnswered) {
                              if (optIdx === q.correct_answer) {
                                optionStyle.border = '1px solid var(--color-success)';
                                optionStyle.background = 'var(--color-success-subtle)';
                                optionStyle.color = 'var(--color-success-text)';
                                optionStyle.fontWeight = 'var(--font-weight-semibold)';
                              } else if (optIdx === answeredOpt) {
                                optionStyle.border = '1px solid var(--color-danger)';
                                optionStyle.background = 'var(--color-danger-subtle)';
                                optionStyle.color = 'var(--color-danger-text)';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                style={optionStyle}
                                onClick={() => handleSelectQuizOption(qIdx, optIdx, q.correct_answer)}
                                disabled={isAnswered}
                              >
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', opacity: 0.7 }}>
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {isAnswered && (
                          <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border-subtle)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                            <strong style={{ color: answeredOpt === q.correct_answer ? 'var(--color-success-text)' : 'var(--color-danger-text)', display: 'block', marginBottom: 'var(--space-1)' }}>
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
                        style={{
                          background: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border-default)',
                          borderRadius: 'var(--radius-lg)',
                          padding: 'var(--space-4-5) var(--space-5)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--space-3)',
                        }}
                      >
                        {/* Header: Title, Platform, Difficulty, Solve Button */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2-5)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2-5)', flexWrap: 'wrap' }}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
                              {prob.title}
                            </h4>
                            <span
                              style={{
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 'var(--font-weight-bold)',
                                padding: 'var(--space-0-5) var(--space-2)',
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
                                padding: 'var(--space-0-5) var(--space-2)',
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
                              style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-1-5) var(--space-3-5)', gap: 'var(--space-1-5)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                            >
                              Solve Problem
                              <i className="ti ti-external-link" style={{ fontSize: 'var(--font-size-sm)' }}></i>
                            </a>
                          )}
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.5' }}>
                          {prob.description}
                        </p>

                        {/* Concepts */}
                        {prob.concepts && prob.concepts.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1-5)', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-muted)' }}>Concepts:</span>
                            {prob.concepts.map((c, cIdx) => (
                              <span
                                key={cIdx}
                                style={{
                                  fontSize: 'var(--font-size-xs)',
                                  padding: 'var(--space-0-5) var(--space-2)',
                                  borderRadius: 'var(--radius-xs)',
                                  background: 'var(--color-bg-surface)',
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
                              padding: 'var(--space-2) var(--space-3)',
                              fontSize: 'var(--font-size-sm)',
                              color: 'var(--color-text-secondary)',
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
        </ModalBody>

        <ModalFooter className="pt-3 border-t border-[var(--color-border-subtle)]">
          <button className="btn" onClick={onClose} style={{ fontSize: 'var(--font-size-md)', padding: 'var(--space-1-5) var(--space-3-5)' }}>
            Close
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
