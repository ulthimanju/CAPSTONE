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

  // ── 1. Fetch Learning Path to resolve Unit Meta ──────────────────────────────
  const fetchUnitMeta = useCallback(async () => {
    if (!workspaceId || !unitId) return null;

    try {
      const headers = {};
      if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
      if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

      const res = await apiClient.get(`/api/v1/workspaces/${workspaceId}/learning-path`, { headers });
      const rawPayload = res.data?.learning_path !== undefined ? res.data.learning_path : res.data;
      const payload = rawPayload?.learning_path_json || rawPayload?.generated || rawPayload;
      const units = payload?.units || [];

      // Find unit by id, index, or title match
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

      if (matchedUnit) {
        setUnitMeta(matchedUnit);
        return matchedUnit;
      }
      return null;
    } catch (err) {
      console.error('[LearningUnitSection] Failed to fetch learning path curriculum:', err);
      return null;
    }
  }, [workspaceId, unitId]);

  // ── 2. Fetch Unit Content (Summary, Flashcards, Quiz, Problems) ───────────────
  const fetchUnitContent = useCallback(
    async (unit) => {
      const targetUnit = unit || unitMeta;
      if (!workspaceId || !targetUnit?.title) return;

      setIsLoading(true);
      setError(null);

      try {
        const headers = {};
        if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
        if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

        const res = await apiClient.get(
          `/api/v1/workspaces/${workspaceId}/units/content?unit_title=${encodeURIComponent(targetUnit.title)}`,
          { headers }
        );

        if (res.data && res.data.content) {
          setContentData(res.data.content);

          // Restore quiz answers and score
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
        console.error('[LearningUnitSection] Failed to fetch unit content:', err);
        setError(err?.response?.data || err?.message || 'Failed to load unit content');
        setContentData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, unitMeta]
  );

  // ── 3. Generate Unit Study Bundle ───────────────────────────────────────────
  const handleGenerateContent = useCallback(async () => {
    if (!workspaceId || !unitMeta?.title) return;

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
          unit_title: unitMeta.title,
          unit_description: unitMeta.description || '',
          learning_objectives: unitMeta.learning_objectives || [],
          tags: unitMeta.tags || [],
        },
        { headers }
      );

      if (res.data) {
        setGenerationProgressText('Completed!');
        await fetchUnitContent(unitMeta);
      }
    } catch (err) {
      console.error('[LearningUnitSection] Failed to trigger unit content generation:', err);
      setError(err?.response?.data || err?.message || 'Generation request failed');
    } finally {
      setIsGenerating(false);
    }
  }, [workspaceId, unitMeta, fetchUnitContent]);

  // ── 4. Initial Load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      const meta = await fetchUnitMeta();
      if (isMounted && meta) {
        await fetchUnitContent(meta);
      } else if (isMounted) {
        setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [fetchUnitMeta, fetchUnitContent]);

  // ── 5. Real-Time SSE Listener for Unit Generation ───────────────────────────
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
          data.unit_title === unitMeta.title
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
            fetchUnitContent(unitMeta);
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
  }, [workspaceId, unitMeta, fetchUnitContent]);

  // ── 6. Flashcards Helpers ───────────────────────────────────────────────────
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

  // ── 7. Quiz Helpers ─────────────────────────────────────────────────────────
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
        await apiClient.patch(
          `/api/v1/workspaces/${workspaceId}/units/quiz-progress`,
          {
            unit_title: unitMeta.title,
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

    if (!contentData?.quiz || !unitMeta?.title) return;
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
          unit_title: unitMeta.title,
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
    hasContent: Boolean(contentData && (contentData.summary || contentData.flashcards || contentData.quiz || contentData.problems)),
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
    refetch: () => fetchUnitContent(unitMeta),
  };
}
