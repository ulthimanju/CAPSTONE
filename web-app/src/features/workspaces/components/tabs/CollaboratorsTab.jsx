import React, { useState } from 'react';
import { UserPlus, Users, Trash2, Mail, ShieldAlert, Loader2, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import {
  useMembersQuery,
  useInvitationsQuery,
  useRemoveMemberMutation,
  useUpdateMemberRoleMutation,
  useCancelInvitationMutation,
} from '../../hooks/useMembers';
import { InviteCollaboratorModal } from '../InviteCollaboratorModal';
import { useAuthStore } from '@/store/authStore';

export function CollaboratorsTab({ workspace }) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.user);

  const {
    data: members = [],
    isLoading: isLoadingMembers,
    isError: isErrorMembers,
  } = useMembersQuery(workspace.id);

  const {
    data: invitations = [],
    isLoading: isLoadingInvites,
  } = useInvitationsQuery(workspace.id);

  const removeMutation = useRemoveMemberMutation(workspace.id);
  const updateRoleMutation = useUpdateMemberRoleMutation(workspace.id);
  const cancelInviteMutation = useCancelInvitationMutation(workspace.id);

  const isOwner = workspace.user_role === 'OWNER' || workspace.owner_id === currentUser?.id;
  const isEditor = isOwner || workspace.user_role === 'EDITOR';

  const handleRoleChange = (userId, newRole) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleRemove = (userId) => {
    if (window.confirm('Are you sure you want to remove this collaborator from the workspace?')) {
      removeMutation.mutate(userId);
    }
  };

  const handleCancelInvite = (invitationId) => {
    cancelInviteMutation.mutate(invitationId);
  };

  return (
    <div className="space-y-8">
      {/* Active Members Section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-text">
              Active Collaborators ({members.length})
            </h2>
            <p className="font-body text-xs text-text/70">
              Users who have joined and have active study access to this workspace.
            </p>
          </div>

          {isEditor && (
            <Button
              onClick={() => setIsInviteModalOpen(true)}
              leftIcon={<UserPlus className="h-4 w-4" />}
              className="text-xs"
            >
              Invite Collaborator
            </Button>
          )}
        </div>

        {isLoadingMembers && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        )}

        {!isLoadingMembers && !isErrorMembers && members.length > 0 && (
          <Card className="divide-y divide-sep-line p-0 overflow-hidden">
            {members.map((member) => {
              const isSelf = member.user_id === currentUser?.id;
              const isMemberOwner = member.role === 'OWNER' || member.user_id === workspace.owner_id;

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-surface-hover/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={member.user_name || member.user_email || 'Collaborator'} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-text">
                          {member.user_name || 'Collaborator'}
                        </span>
                        {isSelf && (
                          <span className="font-mono text-[10px] text-text/50">(You)</span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-text/60">
                        {member.user_email || 'Verified Student'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Role Badge or Selector */}
                    {isOwner && !isMemberOwner ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                        disabled={updateRoleMutation.isPending}
                        className="rounded-ui border border-sep-line bg-bg px-2.5 py-1 font-mono text-xs text-text focus-visible:outline-none focus-visible:border-accent"
                        aria-label={`Change role for ${member.user_name || member.user_email}`}
                      >
                        <option value="EDITOR">EDITOR</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    ) : (
                      <Badge variant="role">{member.role}</Badge>
                    )}

                    {/* Remove Member Button (Owner only, cannot remove owner) */}
                    {isOwner && !isMemberOwner && !isSelf && (
                      <button
                        type="button"
                        onClick={() => handleRemove(member.user_id)}
                        disabled={removeMutation.isPending}
                        className="rounded-ui p-1.5 text-text/50 hover:bg-danger-tint hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                        title="Remove member"
                        aria-label={`Remove ${member.user_name || member.user_email}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>

      {/* Pending Invitations Section */}
      <div className="space-y-4 pt-4 border-t border-sep-line">
        <div>
          <h3 className="font-display text-base font-bold text-text">
            Pending Invitations ({invitations.length})
          </h3>
          <p className="font-body text-xs text-text/70">
            Invitations waiting to be accepted by recipient email addresses.
          </p>
        </div>

        {isLoadingInvites && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        )}

        {!isLoadingInvites && invitations.length === 0 && (
          <div className="rounded-ui border border-dashed border-sep-line bg-surface-raised/40 p-6 text-center">
            <p className="font-mono text-xs text-text/60">
              No pending invitations for this workspace.
            </p>
          </div>
        )}

        {!isLoadingInvites && invitations.length > 0 && (
          <Card className="divide-y divide-sep-line p-0 overflow-hidden">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3.5 hover:bg-surface-hover/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-text/50" />
                  <div>
                    <span className="font-mono text-xs font-medium text-text">
                      {inv.invited_email}
                    </span>
                    <span className="ml-2 font-mono text-[10px] text-text/50">
                      (Role: {inv.role})
                    </span>
                  </div>
                </div>

                {isOwner && (
                  <Button
                    variant="outline"
                    onClick={() => handleCancelInvite(inv.id)}
                    disabled={cancelInviteMutation.isPending}
                    className="text-xs py-1 px-2.5"
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* Modal Dialog for Inviting */}
      <InviteCollaboratorModal
        workspaceId={workspace.id}
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
      />
    </div>
  );
}

export default CollaboratorsTab;
