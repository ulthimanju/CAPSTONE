import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import { Card, Button, Badge, RegenerateIcon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useUpdateQuizProgressMutation } from '../hooks/useLearningPath';
import { toast } from 'sonner';

export function UnitQuizView({ workspaceId, unitTitle, quiz = [] }) {
  const [questions, setQuestions] = useState(quiz);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateProgressMutation = useUpdateQuizProgressMutation(workspaceId, unitTitle);

  useEffect(() => {
    if (quiz && Array.isArray(quiz)) {
      setQuestions(quiz);
      const initialAnswers = {};
      let hasPreviousAnswers = false;
      quiz.forEach((q, idx) => {
        if (q.user_answer !== undefined && q.user_answer !== -1) {
          initialAnswers[idx] = q.user_answer;
          hasPreviousAnswers = true;
        }
      });
      setSelectedAnswers(initialAnswers);
      if (hasPreviousAnswers && Object.keys(initialAnswers).length === quiz.length) {
        setIsSubmitted(true);
      }
    }
  }, [quiz]);

  if (!questions || questions.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center p-8 text-center text-text/60">
        <p className="font-mono text-xs">No quiz questions generated for this unit.</p>
      </div>
    );
  }

  const handleSelect = (questionIndex, optionIndex) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct_answer) {
        score += 1;
      }
    });
    return score;
  };

  const handleSubmit = () => {
    if (Object.keys(selectedAnswers).length < questions.length) {
      toast.warning('Please answer all quiz questions before submitting.');
      return;
    }
    setIsSubmitted(true);

    // Build updated quiz JSON to persist
    const updatedQuiz = questions.map((q, idx) => ({
      ...q,
      user_answer: selectedAnswers[idx] ?? -1,
    }));

    updateProgressMutation.mutate(
      { quizJson: updatedQuiz },
      {
        onSuccess: () => {
          toast.success('Quiz progress saved!');
        },
      }
    );
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
  };

  const score = calculateScore();
  const percentage = Math.round((score / questions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Banner / Score Card */}
      {isSubmitted && (
        <Card className="p-6 border-accent/40 bg-surface-raised flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-text">
                Quiz Result: {score} / {questions.length} ({percentage}%)
              </h3>
              <p className="font-body text-xs text-text/75">
                {percentage >= 80
                  ? 'Outstanding! You have mastered the core learning objectives of this unit.'
                  : percentage >= 60
                  ? 'Good effort! Review the detailed explanations below to reinforce key concepts.'
                  : 'Keep practicing! Check the unit summary notes and try again.'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRetake}
            leftIcon={<RegenerateIcon className="h-4 w-4" />}
            className="text-xs shrink-0"
          >
            Retake Quiz
          </Button>
        </Card>
      )}

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((q, qIndex) => {
          const userAnswer = selectedAnswers[qIndex];
          const hasAnswered = userAnswer !== undefined;

          return (
            <Card key={qIndex} className="p-6 space-y-4 shadow-xs">
              <div className="flex items-start justify-between gap-3 border-b border-sep-line/60 pb-3">
                <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider">
                  Question {qIndex + 1} of {questions.length}
                </span>

                {isSubmitted && (
                  <Badge
                    variant={userAnswer === q.correct_answer ? 'success' : 'danger'}
                    className="font-mono text-[10px]"
                  >
                    {userAnswer === q.correct_answer ? 'Correct' : 'Incorrect'}
                  </Badge>
                )}
              </div>

              <h4 className="font-display text-sm sm:text-base font-bold text-text leading-snug">
                {q.question}
              </h4>

              {/* 4 Choices */}
              <div className="space-y-2.5">
                {q.options.map((option, optIndex) => {
                  const isSelected = userAnswer === optIndex;
                  const isCorrect = isSubmitted && optIndex === q.correct_answer;
                  const isWrong = isSubmitted && isSelected && optIndex !== q.correct_answer;

                  return (
                    <button
                      key={optIndex}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => handleSelect(qIndex, optIndex)}
                      className={cn(
                        'w-full text-left p-3.5 rounded-ui border text-xs sm:text-sm font-body transition-all flex items-center justify-between gap-3',
                        isSelected && !isSubmitted
                          ? 'border-accent bg-sand text-text font-medium ring-1 ring-accent'
                          : 'border-sep-line bg-surface hover:bg-surface-hover text-text/90',
                        isCorrect && 'border-sage bg-sage/10 text-text font-medium ring-1 ring-sage',
                        isWrong && 'border-danger/60 bg-danger/10 text-text font-medium ring-1 ring-danger'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold border',
                            isSelected && !isSubmitted
                              ? 'bg-accent text-white border-accent'
                              : isCorrect
                              ? 'bg-sage text-white border-sage'
                              : isWrong
                              ? 'bg-danger text-white border-danger'
                              : 'bg-sand text-text/70 border-sep-line'
                          )}
                        >
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <span>{option}</span>
                      </div>

                      {isSubmitted && isCorrect && (
                        <CheckCircle2 className="h-4 w-4 text-sage shrink-0" />
                      )}
                      {isSubmitted && isWrong && (
                        <XCircle className="h-4 w-4 text-danger shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Detailed Explanation */}
              {isSubmitted && q.explanation && (
                <div className="rounded-ui bg-sand/60 p-4 border border-sep-line font-body text-xs text-text/80 space-y-1">
                  <span className="font-mono font-bold text-[11px] text-accent uppercase tracking-wider block">
                    Explanation
                  </span>
                  <p className="leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Submit Action Bar */}
      {!isSubmitted && (
        <div className="flex items-center justify-between pt-4 border-t border-sep-line">
          <span className="font-mono text-xs text-text/60">
            {Object.keys(selectedAnswers).length} of {questions.length} questions answered
          </span>

          <Button
            onClick={handleSubmit}
            isLoading={updateProgressMutation.isPending}
            rightIcon={<ArrowRight className="h-4 w-4" />}
            className="text-xs sm:text-sm"
          >
            Submit Quiz
          </Button>
        </div>
      )}
    </div>
  );
}

export default UnitQuizView;
