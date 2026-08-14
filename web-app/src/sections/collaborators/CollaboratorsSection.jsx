/**
 * CollaboratorsSection — UI Composition Layer
 */

import React from 'react';
import { useCollaboratorsSection } from './CollaboratorsSection.logic';
import { CollaboratorsSectionLayout } from './CollaboratorsSection.layout';
import { Button } from '@/components/ui/Button';

import { CopyPayloadButton } from '@/components/ui/CopyPayloadButton';

export function CollaboratorsHeaderActions({ workspaceId }) {
  const { membersData, isLoading, isInviting, refetch } = useCollaboratorsSection(workspaceId);

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <CopyPayloadButton payload={membersData} />
      <Button variant="secondary" size="sm" onClick={refetch} disabled={isLoading || isInviting}>
        Refetch Members
      </Button>
    </div>
  );
}

export function CollaboratorsSection({ workspaceId }) {
  const {
    membersData,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    isLoading,
    isInviting,
    error,
    refetch,
    inviteCollaborator,
    removeMember,
  } = useCollaboratorsSection(workspaceId);

  return (
    <CollaboratorsSectionLayout
      workspaceId={workspaceId}
      membersData={membersData}
      inviteEmail={inviteEmail}
      setInviteEmail={setInviteEmail}
      inviteRole={inviteRole}
      setInviteRole={setInviteRole}
      isLoading={isLoading}
      isInviting={isInviting}
      error={error}
      onRefetch={refetch}
      onInviteCollaborator={inviteCollaborator}
      onRemoveMember={removeMember}
    />
  );
}
