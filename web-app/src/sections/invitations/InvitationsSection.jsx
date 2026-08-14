/**
 * InvitationsSection — UI Composition Layer
 */

import React from 'react';
import { useInvitationsSection } from './InvitationsSection.logic';
import { InvitationsSectionLayout } from './InvitationsSection.layout';
import { Button } from '@/components/ui/Button';

import { CopyPayloadButton } from '@/components/ui/CopyPayloadButton';

export function InvitationsHeaderActions() {
  const { invitationsData, isLoading, refetch } = useInvitationsSection();

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <CopyPayloadButton payload={invitationsData} />
      <Button variant="secondary" size="sm" onClick={refetch} disabled={isLoading}>
        Refetch Invitations
      </Button>
    </div>
  );
}

export function InvitationsSection() {
  const {
    invitationsData,
    isLoading,
    error,
    refetch,
    acceptInvitation,
    rejectInvitation,
  } = useInvitationsSection();

  return (
    <InvitationsSectionLayout
      invitationsData={invitationsData}
      isLoading={isLoading}
      error={error}
      onRefetch={refetch}
      onAcceptInvitation={acceptInvitation}
      onRejectInvitation={rejectInvitation}
    />
  );
}
