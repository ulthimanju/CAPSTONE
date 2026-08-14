/**
 * LearningUnitSection — UI Composition Layer
 */

import React from 'react';
import { useLearningUnitSection } from './LearningUnitSection.logic';
import { LearningUnitSectionLayout } from './LearningUnitSection.layout';

export function LearningUnitSection() {
  const {
    workspaceId,
    unitMeta,
    contentData,
    hasContent,
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
    onGenerate,
  } = useLearningUnitSection();

  return (
    <LearningUnitSectionLayout
      workspaceId={workspaceId}
      unitMeta={unitMeta}
      contentData={contentData}
      hasContent={hasContent}
      isLoading={isLoading}
      isGenerating={isGenerating}
      generationProgressText={generationProgressText}
      error={error}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      cardIndex={cardIndex}
      isFlipped={isFlipped}
      onPrevCard={handlePrevCard}
      onNextCard={handleNextCard}
      onFlipCard={handleFlipCard}
      quizAnswers={quizAnswers}
      quizScore={quizScore}
      onSelectQuizOption={handleSelectQuizOption}
      onResetQuiz={handleResetQuiz}
      onGenerate={onGenerate}
    />
  );
}
