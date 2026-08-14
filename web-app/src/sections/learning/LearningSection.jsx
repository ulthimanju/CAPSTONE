/**
 * LearningSection — UI Composition Layer
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useLearningSection } from './LearningSection.logic';
import { LearningSectionLayout } from './LearningSection.layout';

export function LearningSection({ workspaceId: propWorkspaceId }) {
  const { workspaceId: paramWorkspaceId } = useParams();
  const workspaceId = propWorkspaceId || paramWorkspaceId;

  const {
    learningData,
    isLoading,
    isGenerating,
    error,
    generateLearningPath,
  } = useLearningSection(workspaceId);

  return (
    <LearningSectionLayout
      workspaceId={workspaceId}
      learningData={learningData}
      isLoading={isLoading}
      isGenerating={isGenerating}
      error={error}
      onGenerate={generateLearningPath}
    />
  );
}
