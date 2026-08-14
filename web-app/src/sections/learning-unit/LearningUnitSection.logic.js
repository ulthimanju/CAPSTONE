/**
 * LearningUnitSection — Business Logic Layer
 *
 * Handles unit curriculum resolution, fetching unit study bundle content (summary, flashcards, quiz, problems),
 * generating AI unit bundle, real-time SSE updates, flashcard flip/navigation, and quiz grading & progress persistence.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '@/services/api/client';
import { useAuth } from '@/hooks/useAuth';
import { tokenStorage } from '@/lib/tokenStorage';

export function useLearningUnitSection() {
  const { workspaceId, unitId } = useParams();
  const { user } = useAuth();

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [unitMeta, setUnitMeta] = useState(null);
  const unitMetaRef = useRef(null);

  const [contentData, setContentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgressText, setGenerationProgressText] = useState('');
  const [error, setError] = useState(null);

  // Active Tab state: 'summary' | 'flashcards' | 'quiz' | 'problems'
  const [activeTab, setActiveTab] = useState('summary');

  // Flashcards state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(0);

  // ── Unified Unit & Content Loader (stable, only workspaceId / unitId dependent) ──
  const loadUnitData = useCallback(async () => {
    if (!workspaceId || !unitId) return;

    setIsLoading(true);
    setError(null);

    try {
      const headers = {};
      if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
      if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

      // 1. Fetch learning path to resolve unit metadata
      const res = await apiClient.get(`/api/v1/workspaces/${workspaceId}/learning-path`, { headers });
      const rawPayload = res.data?.learning_path !== undefined ? res.data.learning_path : res.data;
      const payload = rawPayload?.learning_path_json || rawPayload?.generated || rawPayload;
      const units = payload?.units || [];

      // Match unit by id, string index, or encoded/decoded title
      const matchedUnit =
        units.find(
          (u, idx) =>
            u.id === unitId ||
            String(idx) === unitId ||
            encodeURIComponent(u.title) === unitId ||
            u.title === decodeURIComponent(unitId)
        ) ||
        units[parseInt(unitId, 10)] ||
        null;

      if (!matchedUnit) {
        setUnitMeta(null);
        unitMetaRef.current = null;
        setContentData(null);
        setIsLoading(false);
        return;
      }

      setUnitMeta(matchedUnit);
      unitMetaRef.current = matchedUnit;

      // 2. Fetch unit study bundle content
      const contentRes = await apiClient.get(
        `/api/v1/workspaces/${workspaceId}/units/content?unit_title=${encodeURIComponent(matchedUnit.title)}`,
        { headers }
      );

      if (contentRes.data && contentRes.data.content) {
        setContentData(contentRes.data.content);

        // Restore quiz answers and score from stored DB user_answer values
        if (contentRes.data.content.quiz && Array.isArray(contentRes.data.content.quiz)) {
          const initialAnswers = {};
          let initialScore = 0;
          contentRes.data.content.quiz.forEach((q, idx) => {
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
      console.error('[LearningUnitSection] Failed to load unit:', err);
      setError(err?.response?.data || err?.message || 'Failed to load unit content');
      setContentData(null);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, unitId]);

  // ── Initial Load on workspaceId or unitId change ─────────────────────────────
  useEffect(() => {
    loadUnitData();
  }, [loadUnitData]);

  // ── Generate Unit Study Bundle ───────────────────────────────────────────────
  const handleGenerateContent = useCallback(async () => {
    const currentMeta = unitMetaRef.current || unitMeta;
    if (!workspaceId || !currentMeta?.title) return;

    setIsGenerating(true);
    setGenerationProgressText('Synthesizing Summary, Flashcards, Quiz & Problems with Gemini...');
    setError(null);

    try {
      const headers = {};
      if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
      if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

      const res = await apiClient.post(
        `/api/v1/ai/workspaces/${workspaceId}/units/generate`,
        {
          unit_title: currentMeta.title,
          unit_description: currentMeta.description || '',
          learning_objectives: currentMeta.learning_objectives || [],
          tags: currentMeta.tags || [],
        },
        { headers }
      );

      if (res.data) {
        setGenerationProgressText('Completed!');
        await loadUnitData();
      }
    } catch (err) {
      console.error('[LearningUnitSection] Failed to trigger unit content generation:', err);
      setError(err?.response?.data || err?.message || 'Generation request failed');
    } finally {
      setIsGenerating(false);
    }
  }, [workspaceId, unitMeta, loadUnitData]);

  // ── Real-Time SSE Listener for Unit Generation ───────────────────────────────
  useEffect(() => {
    if (!workspaceId || !unitMeta?.title) return;
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
          data.unit_title === (unitMetaRef.current?.title || unitMeta?.title)
        ) {
          if (data.status === 'QUEUED') {
            setGenerationProgressText('Queued...');
          } else if (data.status === 'STARTED') {
            setGenerationProgressText('Retrieving RAG document context...');
          } else if (data.status === 'IN_PROGRESS') {
            setGenerationProgressText('Generating Summary, Flashcards, Quiz & Problems...');
          } else if (data.status === 'COMPLETED') {
            setGenerationProgressText('Completed!');
            setIsGenerating(false);
            loadUnitData();
          } else if (data.status === 'FAILED') {
            setGenerationProgressText('Failed: ' + (data.error || 'Unknown error'));
            setIsGenerating(false);
            setError(data.error || 'Generation failed');
          }
        }
      } catch (e) {
        /* silent catch */
      }
    };

    return () => eventSource.close();
  }, [workspaceId, unitMeta?.title, loadUnitData]);

  // ── Flashcards Helpers ───────────────────────────────────────────────────────
  const handlePrevCard = useCallback(() => {
    setIsFlipped(false);
    setCardIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleNextCard = useCallback(() => {
    setIsFlipped(false);
    setCardIndex((prev) =>
      contentData?.flashcards && prev < contentData.flashcards.length - 1 ? prev + 1 : prev
    );
  }, [contentData]);

  const handleFlipCard = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // ── Quiz Helpers ─────────────────────────────────────────────────────────────
  const handleSelectQuizOption = useCallback(
    async (qIdx, optIdx) => {
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
        const headers = {};
        if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
        const currentMeta = unitMetaRef.current || unitMeta;
        await apiClient.patch(
          `/api/v1/workspaces/${workspaceId}/units/quiz-progress`,
          {
            unit_title: currentMeta?.title,
            quiz_json: updatedQuiz,
          },
          { headers }
        );
      } catch (err) {
        console.error('[LearningUnitSection] Failed to save quiz progress:', err);
      }
    },
    [quizAnswers, contentData, workspaceId, unitMeta]
  );

  const handleResetQuiz = useCallback(async () => {
    setQuizAnswers({});
    setQuizScore(0);

    const currentMeta = unitMetaRef.current || unitMeta;
    if (!contentData?.quiz || !currentMeta?.title) return;

    const resetQuiz = contentData.quiz.map((q) => ({
      ...q,
      user_answer: -1,
    }));
    setContentData((prev) => (prev ? { ...prev, quiz: resetQuiz } : prev));

    try {
      const headers = {};
      if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
      await apiClient.patch(
        `/api/v1/workspaces/${workspaceId}/units/quiz-progress`,
        {
          unit_title: currentMeta.title,
          quiz_json: resetQuiz,
        },
        { headers }
      );
    } catch (err) {
      console.error('[LearningUnitSection] Failed to reset quiz progress:', err);
    }
  }, [contentData, workspaceId, unitMeta]);

  return {
    workspaceId,
    unitId,
    unitMeta,
    contentData,
    hasContent: Boolean(
      contentData &&
        (contentData.summary ||
          contentData.flashcards?.length > 0 ||
          contentData.quiz?.length > 0 ||
          contentData.problems?.length > 0)
    ),
    isLoading,
    isGenerating,
    generationProgressText,
    error,
    activeTab,
    setActiveTab,

    // Flashcards
    cardIndex,
    isFlipped,
    handlePrevCard,
    handleNextCard,
    handleFlipCard,

    // Quiz
    quizAnswers,
    quizScore,
    handleSelectQuizOption,
    handleResetQuiz,

    // Actions
    onGenerate: handleGenerateContent,
    refetch: loadUnitData,
  };
}
