import React, { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Trash2,
  Mail,
  Loader2,
  Search,
  Crown,
  Shield,
  Edit3,
  Eye,
  LogOut,
  RefreshCw,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Check,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/DropdownMenu';
import { InviteCollaboratorModal } from '../InviteCollaboratorModal';
import {
  useMembersQuery,
  useInvitationsQuery,
  useRemoveMemberMutation,
  useUpdateMemberRoleMutation,
  useCancelInvitationMutation,
  useResendInvitationMutation,
  useLeaveWorkspaceMutation,
  useTransferOwnershipMutation,
  useWorkspaceActivitiesQuery,
  useWorkspaceMemberSSE,
} from '../../hooks/useMembers';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/config/constants';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';

export function CollaboratorsTab({ workspace: propWorkspace }) {
  const context = useOutletContext() || {};
  const workspace = propWorkspace || context.workspace;
  const navigate = useNavigate();

  // Real-time live update subscription for workspace member changes
  useWorkspaceMemberSSE(workspace?.id);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [memberToTransfer, setMemberToTransfer] = useState(null);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [showActivities, setShowActivities] = useState(false);

  const currentUser = useAuthStore((state) => state.user);

  const {
    data: members = [],
    isLoading: isLoadingMembers,
    isError: isErrorMembers,
  } = useMembersQuery(workspace?.id);

  const {
    data: invitations = [],
    isLoading: isLoadingInvites,
  } = useInvitationsQuery(workspace?.id);

  const {
    data: activities = [],
    isLoading: isLoadingActivities,
  } = useWorkspaceActivitiesQuery(workspace?.id, 50, {
    enabled: showActivities,
  });

  const removeMutation = useRemoveMemberMutation(workspace?.id, {
    onSuccess: () => {
      setMemberToRemove(null);
      toast.success('Collaborator removed successfully');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to remove collaborator'));
    },
  });

  const updateRoleMutation = useUpdateMemberRoleMutation(workspace?.id, {
    onSuccess: () => {
      toast.success('Member role updated successfully');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to update member role'));
    },
  });

  const cancelInviteMutation = useCancelInvitationMutation(workspace?.id, {
    onSuccess: () => {
      toast.success('Invitation revoked');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to revoke invitation'));
    },
  });

  const resendInviteMutation = useResendInvitationMutation(workspace?.id, {
    onSuccess: () => {
      toast.success('Invitation resent with +7 days validity');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to resend invitation'));
    },
  });

  const leaveMutation = useLeaveWorkspaceMutation(workspace?.id, {
    onSuccess: () => {
      setIsLeaveDialogOpen(false);
      toast.success('You have left the workspace');
      navigate(ROUTES.WORKSPACES);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to leave workspace'));
    },
  });

  const transferMutation = useTransferOwnershipMutation(workspace?.id, {
    onSuccess: () => {
      setMemberToTransfer(null);
      toast.success('Workspace ownership transferred successfully');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to transfer ownership'));
    },
  });

  if (!workspace) return null;

  // Caller role determination
  const isOwner = workspace.user_role === 'OWNER' || workspace.owner_id === currentUser?.id;
  const currentMember = members.find((m) => m.user_id === currentUser?.id);
  const callerRole = isOwner ? 'OWNER' : (currentMember?.role || workspace.user_role || 'VIEWER');
  const canManageMembers = isOwner || callerRole === 'ADMIN' || callerRole === 'EDITOR';

  // Filtered members and invitations
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase().trim();
    return members.filter((m) =>
      (m.user_name || '').toLowerCase().includes(query) ||
      (m.user_email || '').toLowerCase().includes(query) ||
      (m.role || '').toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  const filteredInvitations = useMemo(() => {
    if (!searchQuery.trim()) return invitations;
    const query = searchQuery.toLowerCase().trim();
    return invitations.filter((inv) =>
      (inv.invited_email || '').toLowerCase().includes(query) ||
      (inv.role || '').toLowerCase().includes(query)
    );
  }, [invitations, searchQuery]);

  const handleRoleChange = (userId, newRole, currentVersion = 1) => {
    updateRoleMutation.mutate({ userId, role: newRole, version: currentVersion });
  };

  const formatActivityDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const formatActivityDescription = (act) => {
    const meta = act.metadata_json || {};
    const type = act.activity_type;

    if (type === 'MEMBER_INVITED') {
      const email = meta.invited_email;
      return email ? `${email} INVITED` : 'MEMBER INVITED';
    }

    if (type === 'MEMBER_JOINED') {
      const email = meta.user_email || meta.email || meta.invited_email;
      return email ? `${email} JOINED` : 'MEMBER JOINED';
    }

    if (type === 'MEMBER_ROLE_UPDATED') {
      const email = meta.member_email || meta.user_email;
      const roleInfo = meta.new_role ? ` to ${meta.new_role}` : '';
      return email ? `${email} ROLE UPDATED${roleInfo}` : `MEMBER ROLE UPDATED${roleInfo}`;
    }

    if (type === 'MEMBER_REMOVED') {
      const email = meta.member_email || meta.user_email;
      return email ? `${email} REMOVED` : 'MEMBER REMOVED';
    }

    if (type === 'MEMBER_LEFT') {
      const email = meta.member_email || meta.user_email;
      return email ? `${email} LEFT` : 'MEMBER LEFT';
    }

    if (type === 'OWNERSHIP_TRANSFERRED') {
      return 'OWNERSHIP TRANSFERRED';
    }

    return (type || '').replace(/_/g, ' ');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Active Members Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-text">
              Active Collaborators ({members.length})
            </h2>
            <p className="font-body text-xs text-text/70">
              Users who have joined and have active study access to this workspace.
            </p>
          </div>

          {!isOwner && (
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                onClick={() => setIsLeaveDialogOpen(true)}
                leftIcon={<LogOut className="h-4 w-4 text-danger" />}
                className="text-xs text-danger hover:bg-danger-tint hover:border-danger/40"
              >
                Leave Workspace
              </Button>
            </div>
          )}
        </div>

        {/* Search Filter Bar */}
        {(members.length > 2 || invitations.length > 0) && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text/40 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search collaborators by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs font-mono bg-surface"
            />
          </div>
        )}

        {isLoadingMembers && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        )}

        {!isLoadingMembers && !isErrorMembers && filteredMembers.length === 0 && (
          <div className="rounded-ui border border-dashed border-sep-line bg-surface-raised/40 p-8 text-center">
            <p className="font-mono text-xs text-text/60">
              {searchQuery ? 'No collaborators matched your search.' : 'No members found in this workspace.'}
            </p>
          </div>
        )}

        {!isLoadingMembers && !isErrorMembers && filteredMembers.length > 0 && (
          <Card className="divide-y divide-sep-line p-0 overflow-hidden shadow-xs">
            {filteredMembers.map((member) => {
              const isSelf = member.user_id === currentUser?.id;
              const isMemberOwner = member.role === 'OWNER' || member.user_id === workspace.owner_id;
              const isMemberAdmin = member.role === 'ADMIN';

              // Role edit permissions
              const canEditThisRole =
                isOwner
                  ? !isMemberOwner
                  : callerRole === 'ADMIN'
                  ? !isMemberOwner && !isMemberAdmin
                  : false;

              // Removal permissions
              const canRemoveThisMember =
                isOwner
                  ? !isMemberOwner && !isSelf
                  : callerRole === 'ADMIN'
                  ? !isMemberOwner && !isMemberAdmin && !isSelf
                  : false;

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
                        {isMemberOwner && (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/30">
                            <Crown className="h-2.5 w-2.5" />
                            Owner
                          </span>
                        )}
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
                    {/* Dynamic Role Selector / Badge */}
                    {canEditThisRole ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            disabled={updateRoleMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-ui border border-sep-line bg-surface px-2.5 py-1 font-mono text-xs font-medium text-text transition-colors hover:bg-surface-hover hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 shadow-2xs"
                            aria-label={`Change role for ${member.user_name || member.user_email}`}
                          >
                            <span className="flex items-center gap-1">
                              {member.role === 'ADMIN' && <Shield className="h-3 w-3 text-amber-500" />}
                              {member.role === 'EDITOR' && <Edit3 className="h-3 w-3 text-accent" />}
                              {member.role === 'VIEWER' && <Eye className="h-3 w-3 text-text/60" />}
                              <span>{member.role}</span>
                            </span>
                            <ChevronDown className="h-3 w-3 text-text/40" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 p-1">
                          {isOwner && (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.user_id, 'ADMIN', member.version)}
                              className="flex items-center justify-between text-xs font-mono py-1.5"
                            >
                              <div className="flex items-center gap-2">
                                <Shield className="h-3.5 w-3.5 text-amber-500" />
                                <span>ADMIN</span>
                              </div>
                              {member.role === 'ADMIN' && <Check className="h-3.5 w-3.5 text-accent" />}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.user_id, 'EDITOR', member.version)}
                            className="flex items-center justify-between text-xs font-mono py-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <Edit3 className="h-3.5 w-3.5 text-accent" />
                              <span>EDITOR</span>
                            </div>
                            {member.role === 'EDITOR' && <Check className="h-3.5 w-3.5 text-accent" />}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.user_id, 'VIEWER', member.version)}
                            className="flex items-center justify-between text-xs font-mono py-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <Eye className="h-3.5 w-3.5 text-text/60" />
                              <span>VIEWER</span>
                            </div>
                            {member.role === 'VIEWER' && <Check className="h-3.5 w-3.5 text-accent" />}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Badge variant="role">{member.role}</Badge>
                    )}

                    {/* Transfer Ownership (Owner only) */}
                    {isOwner && !isMemberOwner && !isSelf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMemberToTransfer(member)}
                        className="text-xs py-1 px-2.5 font-mono"
                        title="Transfer workspace ownership to this member"
                      >
                        Transfer Ownership
                      </Button>
                    )}

                    {/* Remove Member Button */}
                    {canRemoveThisMember && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(member)}
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
          <h3 className="font-display text-base font-bold text-text flex items-center gap-2">
            <Mail className="h-4 w-4 text-accent" />
            Pending Invitations ({filteredInvitations.length})
          </h3>
          <p className="font-body text-xs text-text/70">
            Invitations waiting for recipient email acceptance.
          </p>
        </div>

        {isLoadingInvites && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        )}

        {!isLoadingInvites && filteredInvitations.length === 0 && (
          <div className="rounded-ui border border-dashed border-sep-line bg-surface-raised/40 p-6 text-center">
            <p className="font-mono text-xs text-text/60">
              No pending invitations for this workspace.
            </p>
          </div>
        )}

        {!isLoadingInvites && filteredInvitations.length > 0 && (
          <Card className="divide-y divide-sep-line p-0 overflow-hidden shadow-xs">
            {filteredInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-surface-hover/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-text/50 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-text">
                        {inv.invited_email}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-sand border border-sep-line text-text/70">
                        {inv.role}
                      </span>
                    </div>
                    {inv.expires_at && (
                      <div className="font-mono text-[10px] text-text/50 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        Expires: {formatActivityDate(inv.expires_at)}
                      </div>
                    )}
                  </div>
                </div>

                {canManageMembers && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendInviteMutation.mutate(inv.id)}
                      disabled={resendInviteMutation.isPending}
                      leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                      className="text-xs py-1 px-2.5"
                    >
                      Resend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelInviteMutation.mutate(inv.id)}
                      disabled={cancelInviteMutation.isPending}
                      className="text-xs py-1 px-2.5 text-danger hover:bg-danger-tint hover:border-danger/30"
                    >
                      Revoke
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* Activity & Audit Trail Section */}
      <div className="space-y-4 pt-4 border-t border-sep-line">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-text flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              Collaborator Activity Log
            </h3>
            <p className="font-body text-xs text-text/70">
              Audit log of member invitations, role changes, and workspace access events.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowActivities((prev) => !prev)}
            rightIcon={showActivities ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            className="text-xs font-mono"
          >
            {showActivities ? 'Hide Activity' : 'View Activity'}
          </Button>
        </div>

        {showActivities && (
          <div className="space-y-2 mt-2">
            {isLoadingActivities ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            ) : activities.length === 0 ? (
              <div className="rounded-ui border border-dashed border-sep-line bg-surface-raised/40 p-4 text-center">
                <p className="font-mono text-xs text-text/60">No recent activity recorded.</p>
              </div>
            ) : (
              <Card className="divide-y divide-sep-line p-0 overflow-hidden shadow-xs">
                {activities.slice(0, 25).map((act) => (
                  <div key={act.id} className="p-3 text-xs font-mono flex items-center justify-between hover:bg-surface-hover/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text">
                        {formatActivityDescription(act)}
                      </span>
                    </div>
                    <span className="text-text/50 text-[10px] shrink-0">
                      {formatActivityDate(act.created_at)}
                    </span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Invite Collaborator Modal */}
      <InviteCollaboratorModal
        workspaceId={workspace.id}
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
      />

      {/* Remove Member Confirmation Modal */}
      <ConfirmDialog
        open={!!memberToRemove}
        onOpenChange={(open) => {
          if (!open) setMemberToRemove(null);
        }}
        title="Remove Collaborator"
        description={`Are you sure you want to remove ${
          memberToRemove?.user_name || memberToRemove?.user_email || 'this member'
        } from the workspace? They will lose access to course study documents and materials.`}
        confirmText="Remove Collaborator"
        cancelText="Cancel"
        variant="danger"
        isLoading={removeMutation.isPending}
        onConfirm={() => {
          if (memberToRemove) removeMutation.mutate(memberToRemove.user_id);
        }}
      />

      {/* Transfer Ownership Confirmation Modal */}
      <ConfirmDialog
        open={!!memberToTransfer}
        onOpenChange={(open) => {
          if (!open) setMemberToTransfer(null);
        }}
        title="Transfer Workspace Ownership"
        description={`Are you sure you want to transfer primary ownership of "${workspace.name}" to ${
          memberToTransfer?.user_name || memberToTransfer?.user_email || 'this member'
        }? You will no longer be the primary owner.`}
        confirmText="Transfer Ownership"
        cancelText="Cancel"
        variant="danger"
        isLoading={transferMutation.isPending}
        onConfirm={() => {
          if (memberToTransfer) transferMutation.mutate(memberToTransfer.user_id);
        }}
      />

      {/* Leave Workspace Confirmation Modal */}
      <ConfirmDialog
        open={isLeaveDialogOpen}
        onOpenChange={setIsLeaveDialogOpen}
        title="Leave Workspace"
        description={`Are you sure you want to leave "${workspace.name}"? You will lose access to its documents, summaries, and generated learning paths.`}
        confirmText="Leave Workspace"
        cancelText="Cancel"
        variant="danger"
        isLoading={leaveMutation.isPending}
        onConfirm={() => leaveMutation.mutate()}
      />
    </div>
  );
}

export default CollaboratorsTab;
