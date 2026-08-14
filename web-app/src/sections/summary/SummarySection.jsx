/**
 * SummarySection — UI Composition Layer
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useSummarySection } from './SummarySection.logic';
import { SummarySectionLayout } from './SummarySection.layout';

export function SummarySection({ workspaceId: propWorkspaceId }) {
  const { workspaceId: paramWorkspaceId } = useParams();
  const workspaceId = propWorkspaceId || paramWorkspaceId;

  const {
    summaryData,
    isLoading,
    isGenerating,
    error,
    refetch,
    generateSummary,
  } = useSummarySection(workspaceId);

  return (
    <SummarySectionLayout
      workspaceId={workspaceId}
      summaryData={summaryData}
      isLoading={isLoading}
      isGenerating={isGenerating}
      error={error}
      onRefetch={refetch}
      onGenerate={generateSummary}
    />
  );
}
