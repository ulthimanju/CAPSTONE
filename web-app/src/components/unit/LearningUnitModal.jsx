import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api/client';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { RichMarkdownRenderer } from '../ui/RichMarkdownRenderer';
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

  // Fetch unit content on open
  useEffect(() => {
    if (!open || !unit || !workspaceId) return;
    fetchUnitContent();
  }, [open, unit, workspaceId]);

  // Listen to SSE events for LearningUnitGeneration
  useEffect(() => {
    if (!open || !workspaceId || !unit) return;
    const eventSource = new EventSource('/api/v1/notifications/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.event_name === 'LearningUnitGeneration' &&
          data.workspace_id === workspaceId &&
          data.unit_title === unit.title
        ) {
          if (data.status === 'QUEUED') setGenerationProgressText('Queued...');
          else if (data.status === 'STARTED') setGenerationProgressText('Retrieving RAG document context (~1K tokens)...');
          else if (data.status === 'IN_PROGRESS') setGenerationProgressText('Generating Summary, Flashcards & Quiz in 1 pass with Gemini...');
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
        console.error('Error parsing SSE event in LearningUnitModal:', e);
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
      setGenerationProgressText('Starting generation pipeline...');
      const headers = user?.id ? { 'X-User-ID': user.id } : {};
      await apiClient.post(
        `/api/v1/ai/workspaces/${workspaceId}/units/generate`,
        {
          unit_title: unit.title,
          unit_description: unit.description || '',
          learning_objectives: unit.learning_objectives || [],
          tags: unit.tags || [],
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
      <ModalContent size="xl" style={{ background: 'var(--bg-1)', border: '1px solid var(--border-strong)', color: 'var(--text)', borderRadius: '12px', maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden' }}>
        {/* Header */}
        <ModalHeader
          title={unit.title}
          description={unit.description || 'Study Unit Content'}
          action={
            contentData && (
              <button
                className="btn"
                style={{ fontSize: '12px', padding: '4px 10px', color: 'var(--text-2)', borderColor: 'var(--border-strong)' }}
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
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', padding: '0 20px', background: 'var(--bg-1)' }}>
            <button
              className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
              style={{ padding: '10px 16px', fontSize: '13px', borderBottom: activeTab === 'summary' ? '2px solid var(--accent)' : 'none', color: activeTab === 'summary' ? 'var(--text)' : 'var(--text-3)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <i className="ti ti-file-text" style={{ marginRight: '6px' }}></i> Summary
            </button>

            <button
              className={`tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
              onClick={() => setActiveTab('flashcards')}
              style={{ padding: '10px 16px', fontSize: '13px', borderBottom: activeTab === 'flashcards' ? '2px solid var(--accent)' : 'none', color: activeTab === 'flashcards' ? 'var(--text)' : 'var(--text-3)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <i className="ti ti-cards" style={{ marginRight: '6px' }}></i> Flashcards ({contentData.flashcards?.length || 0})
            </button>

            <button
              className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
              onClick={() => setActiveTab('quiz')}
              style={{ padding: '10px 16px', fontSize: '13px', borderBottom: activeTab === 'quiz' ? '2px solid var(--accent)' : 'none', color: activeTab === 'quiz' ? 'var(--text)' : 'var(--text-3)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <i className="ti ti-help-circle" style={{ marginRight: '6px' }}></i> Quiz ({contentData.quiz?.length || 0})
            </button>
          </div>
        )}

        {/* Body Content */}
        <ModalBody className="py-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <Spinner size="lg" />
            </div>
          ) : generating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', textAlign: 'center', padding: '2rem' }}>
              <Spinner size="lg" />
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                {generationProgressText}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Gemini is synthesizing Summary, Flashcards & Quiz from RAG document context in 1 pass...</p>
            </div>
          ) : !contentData ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '35vh', textAlign: 'center', padding: '2rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '1.25rem' }}>
                <i className="ti ti-sparkles"></i>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '0.5rem' }}>Unit Content Not Generated Yet</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: '420px', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                Generate a unified study bundle containing a rich summary, interactive flashcards, and a quiz — powered by RAG context from your workspace documents in 1 single pass.
              </p>
              <button className="btn btn-primary" onClick={handleGenerateContent} style={{ padding: '10px 20px', fontSize: '13px' }}>
                <i className="ti ti-bolt"></i> Generate Unit Study Bundle
              </button>
            </div>
          ) : (
            <>
              {/* SUB-TAB 1: SUMMARY */}
              {activeTab === 'summary' && contentData.summary && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Overview */}
                  {contentData.summary.overview && (
                    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '16px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="ti ti-notes"></i> Overview
                      </h4>
                      <RichMarkdownRenderer content={contentData.summary.overview} />
                    </div>
                  )}

                  {/* Key Takeaways */}
                  {contentData.summary.key_takeaways && contentData.summary.key_takeaways.length > 0 && (
                    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '16px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#3b82f6', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="ti ti-bulb"></i> Key Takeaways
                      </h4>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {contentData.summary.sections.map((sec, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-2)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '16px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                            {sec.title}
                          </h4>
                          <RichMarkdownRenderer content={sec.content} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 2: FLASHCARDS */}
              {activeTab === 'flashcards' && contentData.flashcards && contentData.flashcards.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '1rem 0' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                    Card {cardIndex + 1} of {contentData.flashcards.length}
                  </div>

                  {/* Flashcard Component */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    style={{
                      width: '100%',
                      maxWidth: '540px',
                      minHeight: '220px',
                      background: 'var(--bg-1)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: '12px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justify: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      transition: 'transform 0.2s ease, border-color 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', top: '12px', right: '14px', fontSize: '11px', color: 'var(--accent)', fontWeight: '600', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                      {isFlipped ? 'Answer' : 'Question'}
                    </span>
                    <h3 style={{ fontSize: isFlipped ? '15px' : '17px', fontWeight: isFlipped ? '400' : '600', color: isFlipped ? 'var(--text-2)' : 'var(--text)', lineHeight: '1.6', margin: 0 }}>
                      {isFlipped
                        ? contentData.flashcards[cardIndex]?.back
                        : contentData.flashcards[cardIndex]?.front}
                    </h3>
                    <p style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-3)' }}>
                      Click card to flip ↺
                    </p>
                  </div>

                  {/* Controls */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      className="btn"
                      onClick={handlePrevCard}
                      disabled={cardIndex === 0}
                      style={{ fontSize: '13px', padding: '8px 16px' }}
                    >
                      <i className="ti ti-chevron-left"></i> Previous
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleNextCard}
                      disabled={cardIndex === contentData.flashcards.length - 1}
                      style={{ fontSize: '13px', padding: '8px 16px' }}
                    >
                      Next <i className="ti ti-chevron-right"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: QUIZ */}
              {activeTab === 'quiz' && contentData.quiz && contentData.quiz.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', pb: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-2)', fontWeight: '600' }}>
                      Score: {quizScore} / {contentData.quiz.length}
                    </span>
                    <button
                      className="btn"
                      onClick={handleResetQuiz}
                      style={{ fontSize: '12px', padding: '4px 10px', color: 'var(--text-3)' }}
                    >
                      <i className="ti ti-rotate-clockwise"></i> Reset Quiz
                    </button>
                  </div>

                  {contentData.quiz.map((q, qIdx) => {
                    const answeredOpt = quizAnswers[qIdx];
                    const isAnswered = answeredOpt !== undefined;
                    return (
                      <div key={qIdx} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '14px', display: 'flex', gap: '8px' }}>
                          <span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>Q{qIdx + 1}.</span> {q.question}
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                          {q.options.map((opt, optIdx) => {
                            let optionStyle = {
                              padding: '10px 14px',
                              borderRadius: '6px',
                              fontSize: '13px',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-2)',
                              color: 'var(--text-2)',
                              cursor: isAnswered ? 'default' : 'pointer',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
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
                                <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', opacity: 0.7 }}>
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {isAnswered && (
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-2)', lineHeight: '1.5' }}>
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
        </ModalBody>

        <ModalFooter className="pt-3 border-t border-[#2a2a32]">
          <button className="btn" onClick={onClose} style={{ fontSize: '13px', padding: '6px 14px' }}>
            Close
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
