/**
 * CollaboratorsSection — UI Composition Layer
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useCollaboratorsSection } from './CollaboratorsSection.logic';
import { CollaboratorsSectionLayout } from './CollaboratorsSection.layout';

export function CollaboratorsSection({ workspaceId: propWorkspaceId }) {
  const { workspaceId: paramWorkspaceId } = useParams();
  const workspaceId = propWorkspaceId || paramWorkspaceId;

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
