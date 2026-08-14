/**
 * LearningSection — UI Composition Layer
 */

import React from 'react';
import { useLearningSection } from './LearningSection.logic';
import { LearningSectionLayout } from './LearningSection.layout';
import { Button } from '@/components/ui/Button';

import { CopyPayloadButton } from '@/components/ui/CopyPayloadButton';

export function LearningHeaderActions({ workspaceId }) {
  const { learningData, isLoading, isGenerating, refetch, generateLearningPath } = useLearningSection(workspaceId);

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <CopyPayloadButton payload={learningData} />
      <Button variant="secondary" size="sm" onClick={refetch} disabled={isLoading || isGenerating}>
        Refetch Payload
      </Button>
      <Button variant="primary" size="sm" onClick={generateLearningPath} loading={isGenerating} disabled={isLoading}>
        Generate Learning Path
      </Button>
    </div>
  );
}

export function LearningSection({ workspaceId }) {
  const {
    learningData,
    isLoading,
    isGenerating,
    error,
    refetch,
    generateLearningPath,
  } = useLearningSection(workspaceId);

  return (
    <LearningSectionLayout
      workspaceId={workspaceId}
      learningData={learningData}
      isLoading={isLoading}
      isGenerating={isGenerating}
      error={error}
      onRefetch={refetch}
      onGenerate={generateLearningPath}
    />
  );
}
