/**
 * SummarySection — UI Composition Layer
 *
 * Connects useSummarySection hook to SummarySectionLayout.
 * Also exports SummaryHeaderActions for placement in MainHeader.
 */

import React from 'react';
import { useSummarySection } from './SummarySection.logic';
import { SummarySectionLayout } from './SummarySection.layout';
import { Button } from '@/components/ui/Button';

import { CopyPayloadButton } from '@/components/ui/CopyPayloadButton';

export function SummaryHeaderActions({ workspaceId }) {
  const { summaryData, isLoading, isGenerating, refetch, generateSummary } = useSummarySection(workspaceId);

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <CopyPayloadButton payload={summaryData} />
      <Button variant="secondary" size="sm" onClick={refetch} disabled={isLoading || isGenerating}>
        Refetch Payload
      </Button>
      <Button variant="primary" size="sm" onClick={generateSummary} loading={isGenerating} disabled={isLoading}>
        Generate Summary
      </Button>
    </div>
  );
}

export function SummarySection({ workspaceId }) {
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
