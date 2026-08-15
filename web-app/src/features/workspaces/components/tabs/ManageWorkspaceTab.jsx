import React, { useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Save,
  Trash2,
  Terminal,
  BookOpen,
  Lock,
  Users,
  Globe,
  Check,
  UserPlus,
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
  Settings,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InviteCollaboratorModal } from '../InviteCollaboratorModal';
import { createWorkspaceRequestSchema } from '../../schemas/workspaceSchemas';
import { useUpdateWorkspaceMutation, useDeleteWorkspaceMutation } from '../../hooks/useWorkspaces';
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

export function ManageWorkspaceTab({ workspace: propWorkspace }) {
  const context = useOutletContext() || {};
  const workspace = propWorkspace || context.workspace;
  const navigate = useNavigate();

  // Real-time live update subscription for workspace member & status changes
  useWorkspaceMemberSSE(workspace?.id);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [memberToTransfer, setMemberToTransfer] = useState(null);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [showActivities, setShowActivities] = useState(false);

  const currentUser = useAuthStore((state) => state.user);

  // Form for Workspace Settings
  const {
    register,
    handleSubmit,
    control,
    formState: { errors: formErrors },
  } = useForm({
    resolver: zodResolver(createWorkspaceRequestSchema),
    defaultValues: {
      name: workspace?.name || '',
      domain_type: workspace?.domain_type || 'TECHNICAL',
      visibility: workspace?.visibility || 'PRIVATE',
    },
  });

  const updateWorkspaceMutation = useUpdateWorkspaceMutation(workspace?.id, {
    onSuccess: () => {
      setSaveSuccess(true);
      toast.success('Workspace settings updated successfully');
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to update workspace settings'));
    },
  });

  const deleteWorkspaceMutation = useDeleteWorkspaceMutation({
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      toast.success('Workspace deleted permanently');
      navigate(ROUTES.WORKSPACES, { replace: true });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to delete workspace'));
    },
  });

  // Queries for Collaborators, Invitations, Activities
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

  // Member Action Mutations
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

  const handleSettingsSubmit = (formData) => {
    updateWorkspaceMutation.mutate(formData);
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
    <div className="space-y-10 pb-16">
      {/* 1. Workspace General Settings Section */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold text-text flex items-center gap-2">
            <Settings className="h-5 w-5 text-accent" />
            Workspace Settings
          </h2>
          <p className="font-body text-xs text-text/70">
            Configure workspace display name, academic specialization domain, and privacy visibility.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit(handleSettingsSubmit)} className="space-y-5">
            {/* Name Input */}
            <div className="space-y-1.5">
              <label htmlFor="manage-workspace-name" className="block text-xs font-mono font-medium text-text">
                Workspace Name
              </label>
              <Input
                id="manage-workspace-name"
                error={!!formErrors.name}
                disabled={!isOwner && callerRole !== 'ADMIN'}
                {...register('name')}
              />
              {formErrors.name && (
                <p className="font-mono text-[11px] text-danger">{formErrors.name.message}</p>
              )}
            </div>

            {/* Domain Type Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-text">
                Domain Specialization
              </label>
              <Controller
                name="domain_type"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={!isOwner && callerRole !== 'ADMIN'}
                      onClick={() => field.onChange('TECHNICAL')}
                      className={cn(
                        'flex items-center gap-2.5 rounded-ui border p-3 text-left transition-all',
                        field.value === 'TECHNICAL'
                          ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                          : 'border-sep-line bg-bg text-text/80 hover:bg-surface-hover',
                        (!isOwner && callerRole !== 'ADMIN') && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <Terminal className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <div>
                        <div className="text-xs font-bold font-mono">Technical (CSE / Code / Math)</div>
                        <div className="text-[10px] text-text/60 font-body">Syntax parsing & algorithm focus</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={!isOwner && callerRole !== 'ADMIN'}
                      onClick={() => field.onChange('NON_TECHNICAL')}
                      className={cn(
                        'flex items-center gap-2.5 rounded-ui border p-3 text-left transition-all',
                        field.value === 'NON_TECHNICAL'
                          ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                          : 'border-sep-line bg-bg text-text/80 hover:bg-surface-hover',
                        (!isOwner && callerRole !== 'ADMIN') && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <div>
                        <div className="text-xs font-bold font-mono">Non-Technical</div>
                        <div className="text-[10px] text-text/60 font-body">Humanities, General study</div>
                      </div>
                    </button>
                  </div>
                )}
              />
            </div>

            {/* Visibility Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-text">
                Visibility
              </label>
              <Controller
                name="visibility"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={!isOwner && callerRole !== 'ADMIN'}
                      onClick={() => field.onChange('PRIVATE')}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-ui border p-2 text-center transition-all',
                        field.value === 'PRIVATE'
                          ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                          : 'border-sep-line bg-bg text-text/70 hover:bg-surface-hover',
                        (!isOwner && callerRole !== 'ADMIN') && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="text-[11px] font-mono">Private</span>
                    </button>

                    <button
                      type="button"
                      disabled={!isOwner && callerRole !== 'ADMIN'}
                      onClick={() => field.onChange('INTERNAL')}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-ui border p-2 text-center transition-all',
                        field.value === 'INTERNAL'
                          ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                          : 'border-sep-line bg-bg text-text/70 hover:bg-surface-hover',
                        (!isOwner && callerRole !== 'ADMIN') && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="text-[11px] font-mono">Internal</span>
                    </button>

                    <button
                      type="button"
                      disabled={!isOwner && callerRole !== 'ADMIN'}
                      onClick={() => field.onChange('PUBLIC')}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-ui border p-2 text-center transition-all',
                        field.value === 'PUBLIC'
                          ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                          : 'border-sep-line bg-bg text-text/70 hover:bg-surface-hover',
                        (!isOwner && callerRole !== 'ADMIN') && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="text-[11px] font-mono">Public</span>
                    </button>
                  </div>
                )}
              />
            </div>

            {/* Action Buttons */}
            {(isOwner || callerRole === 'ADMIN') && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-sep-line">
                <Button
                  type="submit"
                  isLoading={updateWorkspaceMutation.isPending}
                  leftIcon={saveSuccess ? <Check className="h-4 w-4 text-success" /> : <Save className="h-4 w-4" />}
                >
                  {saveSuccess ? 'Saved Changes' : 'Save Changes'}
                </Button>

                {isOwner && (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    isLoading={deleteWorkspaceMutation.isPending}
                    leftIcon={<Trash2 className="h-4 w-4" />}
                  >
                    Delete Workspace
                  </Button>
                )}
              </div>
            )}
          </form>
        </Card>
      </div>

      {/* 2. Active Collaborators Section */}
      <div className="space-y-4 pt-6 border-t border-sep-line">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-text flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-accent" />
              Active Collaborators ({members.length})
            </h2>
            <p className="font-body text-xs text-text/70">
              Manage study permissions, assign roles, and view current workspace participants.
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

              const canEditThisRole =
                isOwner
                  ? !isMemberOwner
                  : callerRole === 'ADMIN'
                  ? !isMemberOwner && !isMemberAdmin
                  : false;

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
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.user_id, e.target.value, member.version)}
                        disabled={updateRoleMutation.isPending}
                        className="rounded-ui border border-sep-line bg-bg px-2.5 py-1 font-mono text-xs text-text focus-visible:outline-none focus-visible:border-accent shadow-2xs"
                        aria-label={`Change role for ${member.user_name || member.user_email}`}
                      >
                        {isOwner && <option value="ADMIN">ADMIN</option>}
                        <option value="EDITOR">EDITOR</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
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

      {/* 3. Pending Invitations Section */}
      <div className="space-y-4 pt-6 border-t border-sep-line">
        <div>
          <h3 className="font-display text-base font-bold text-text flex items-center gap-2">
            <Mail className="h-4 w-4 text-accent" />
            Pending Invitations ({filteredInvitations.length})
          </h3>
          <p className="font-body text-xs text-text/70">
            Invitations sent and waiting for recipient email verification.
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

      {/* 4. Activity & Audit Trail Section */}
      <div className="space-y-4 pt-6 border-t border-sep-line">
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
        isOwner={isOwner}
      />

      {/* Delete Workspace Confirmation Modal */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Workspace"
        description={`Are you sure you want to permanently delete "${workspace.name}"? All connected documents, AI summaries, and study units will be removed.`}
        confirmText="Delete Workspace"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteWorkspaceMutation.isPending}
        onConfirm={() => deleteWorkspaceMutation.mutate(workspace.id)}
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

export default ManageWorkspaceTab;
