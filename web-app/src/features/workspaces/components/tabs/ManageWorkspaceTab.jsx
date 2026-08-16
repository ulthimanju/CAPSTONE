import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useOutletContext, useLocation, useSearchParams } from 'react-router-dom';
import {
  Save,
  Trash2,
  Users,
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
  ChevronDown,
  ChevronUp,
  UserCheck,
  Settings,
  Archive,
  Lock,
  ArrowRightLeft,
} from 'lucide-react';
import {
  CodeBoldIcon,
  BookLinearIcon,
  LogsIcon,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui';
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
import { WorkspaceNameAvailabilityFeedback } from '../WorkspaceNameAvailabilityFeedback';
import { PREDEFINED_CODE_LANGUAGES } from '../CreateWorkspaceModal';
import {
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useArchiveWorkspaceMutation,
} from '../../hooks/useWorkspaces';
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
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState('');
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [showActivities, setShowActivities] = useState(false);

  const currentUser = useAuthStore((state) => state.user);

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'collaborators' || tabParam === 'general') {
      return tabParam;
    }
    if (location.pathname.endsWith('/collaborators')) {
      return 'collaborators';
    }
    if (location.pathname.endsWith('/settings')) {
      return 'general';
    }
    return 'collaborators';
  }, [searchParams, location.pathname]);

  const handleTabChange = (newTab) => {
    setSearchParams({ tab: newTab });
  };

  const [nameValue, setNameValue] = useState(workspace?.name || '');
  const [domainValue, setDomainValue] = useState(workspace?.domain_type || 'TECHNICAL');
  const [languageValue, setLanguageValue] = useState(workspace?.workspace_code_language || 'Python');
  const [savingField, setSavingField] = useState(null);
  const [savedField, setSavedField] = useState(null);

  useEffect(() => {
    if (workspace) {
      setNameValue(workspace.name || '');
      setDomainValue(workspace.domain_type || 'TECHNICAL');
      setLanguageValue(workspace.workspace_code_language || 'Python');
    }
  }, [
    workspace?.id,
    workspace?.name,
    workspace?.domain_type,
    workspace?.workspace_code_language,
  ]);

  const updateWorkspaceMutation = useUpdateWorkspaceMutation(workspace?.id);

  const handleSaveName = (e) => {
    e?.preventDefault();
    const cleanName = nameValue.trim();
    if (!cleanName || cleanName === workspace?.name) return;
    setSavingField('name');
    updateWorkspaceMutation.mutate(
      { name: cleanName },
      {
        onSuccess: () => {
          setSavingField(null);
          setSavedField('name');
          toast.success('Workspace name updated');
          setTimeout(() => setSavedField(null), 2500);
        },
        onError: (err) => {
          setSavingField(null);
          toast.error(getErrorMessage(err, 'Failed to update workspace name'));
        },
      }
    );
  };

  const handleSaveDomain = (e) => {
    e?.preventDefault();
    if (domainValue === workspace?.domain_type) return;
    setSavingField('domain');
    updateWorkspaceMutation.mutate(
      {
        domain_type: domainValue,
        workspace_code_language: domainValue === 'TECHNICAL' ? languageValue : null,
      },
      {
        onSuccess: () => {
          setSavingField(null);
          setSavedField('domain');
          toast.success('Domain specialization updated');
          setTimeout(() => setSavedField(null), 2500);
        },
        onError: (err) => {
          setSavingField(null);
          toast.error(getErrorMessage(err, 'Failed to update domain specialization'));
        },
      }
    );
  };

  const handleSaveLanguage = (e) => {
    e?.preventDefault();
    if (languageValue === workspace?.workspace_code_language) return;
    setSavingField('language');
    updateWorkspaceMutation.mutate(
      { workspace_code_language: languageValue },
      {
        onSuccess: () => {
          setSavingField(null);
          setSavedField('language');
          toast.success('Primary code language updated');
          setTimeout(() => setSavedField(null), 2500);
        },
        onError: (err) => {
          setSavingField(null);
          toast.error(getErrorMessage(err, 'Failed to update code language'));
        },
      }
    );
  };

  const archiveWorkspaceMutation = useArchiveWorkspaceMutation({
    onSuccess: () => {
      setIsArchiveDialogOpen(false);
      toast.success('Workspace archived successfully');
      navigate('/archived-workspaces', { replace: true });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to archive workspace'));
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

  const eligibleTransferMembers = useMemo(() => {
    return members.filter((m) => m.user_id !== currentUser?.id && m.user_id !== workspace?.owner_id);
  }, [members, currentUser?.id, workspace?.owner_id]);

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

  const tabs = [
    {
      id: 'collaborators',
      label: 'Collaborators',
      icon: Users,
      count: members.length || null,
    },
    {
      id: 'general',
      label: 'General',
      icon: Settings,
      count: null,
    },
  ];

  return (
    <div className="w-full flex flex-col min-h-0 flex-1">
      {/* Attached Sub-Nav Tab Bar right below Main Header */}
      <div className="sticky top-0 z-20 w-full border-b border-sep-line bg-bg px-4 sm:px-6 transition-colors">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-ui font-mono text-xs font-medium transition-all shrink-0 border',
                  isActive
                    ? 'bg-surface-raised border-sep-line text-accent font-semibold shadow-2xs'
                    : 'bg-transparent border-transparent text-text/70 hover:text-text hover:bg-surface-hover'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-accent' : 'text-text/60')} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={cn(
                      'font-mono text-[10px] px-1.5 py-0.5 rounded transition-colors',
                      isActive
                        ? 'bg-accent/10 text-accent font-bold'
                        : 'bg-sep-line/40 text-text/70'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 w-full flex-1 space-y-6 pb-16">
        {/* 1. General Settings Section */}
        {activeTab === 'general' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="grid grid-cols-1 gap-5">
            {/* Card 1: Workspace Name */}
            <Card className="p-5 space-y-3">
              <div className="space-y-1">
                <label htmlFor="manage-workspace-name" className="block text-xs font-mono font-medium text-text">
                  Workspace Name
                </label>
                <p className="text-[11px] text-text/60 font-body">
                  The public identifier and title representing this course or collaborative environment.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex-1">
                    <Input
                      id="manage-workspace-name"
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      disabled={(!isOwner && callerRole !== 'ADMIN') || savingField === 'name'}
                      placeholder="e.g. Operating Systems (CS301)"
                    />
                  </div>

                  {(isOwner || callerRole === 'ADMIN') && (
                    <Button
                      size="sm"
                      type="button"
                      className="h-10 shrink-0 px-4"
                      onClick={handleSaveName}
                      disabled={
                        !nameValue.trim() ||
                        nameValue.trim() === (workspace?.name || '').trim() ||
                        savingField !== null
                      }
                      isLoading={savingField === 'name'}
                      leftIcon={
                        savedField === 'name' ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Edit3 className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      {savedField === 'name' ? 'Renamed' : 'Rename'}
                    </Button>
                  )}
                </div>

                <WorkspaceNameAvailabilityFeedback
                  name={nameValue}
                  excludeWorkspaceId={workspace?.id}
                  initialName={workspace?.name}
                />
              </div>
            </Card>

            {/* Card 2: Domain Specialization */}
            <Card className="p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div>
                  <h3 className="text-xs font-mono font-medium text-text">Domain Specialization</h3>
                  <p className="text-[11px] text-text/60 font-body">
                    Configures AI synthesis routines for code syntax, systems algorithms, or humanities.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={(!isOwner && callerRole !== 'ADMIN') || savingField === 'domain'}
                    onClick={() => setDomainValue('TECHNICAL')}
                    className={cn(
                      'flex items-center gap-2.5 rounded-ui border p-3 text-left transition-all',
                      domainValue === 'TECHNICAL'
                        ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                        : 'border-sep-line bg-bg text-text/80 hover:bg-surface-hover',
                      (!isOwner && callerRole !== 'ADMIN') && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <CodeBoldIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <div>
                      <div className="text-xs font-bold font-mono">Technical (CSE / Code / Math)</div>
                      <div className="text-[10px] text-text/60 font-body">Syntax parsing & algorithm focus</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={(!isOwner && callerRole !== 'ADMIN') || savingField === 'domain'}
                    onClick={() => setDomainValue('NON_TECHNICAL')}
                    className={cn(
                      'flex items-center gap-2.5 rounded-ui border p-3 text-left transition-all',
                      domainValue === 'NON_TECHNICAL'
                        ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                        : 'border-sep-line bg-bg text-text/80 hover:bg-surface-hover',
                      (!isOwner && callerRole !== 'ADMIN') && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <BookLinearIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <div>
                      <div className="text-xs font-bold font-mono">Non-Technical</div>
                      <div className="text-[10px] text-text/60 font-body">Humanities & General study</div>
                    </div>
                  </button>
                </div>
              </div>

              {(isOwner || callerRole === 'ADMIN') && (
                <div className="flex justify-end pt-2 border-t border-sep-line/60">
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleSaveDomain}
                    disabled={
                      domainValue === (workspace?.domain_type || 'TECHNICAL') ||
                      savingField !== null
                    }
                    isLoading={savingField === 'domain'}
                    leftIcon={
                      savedField === 'domain' ? (
                        <Check className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )
                    }
                  >
                    {savedField === 'domain' ? 'Domain Saved' : 'Save Domain'}
                  </Button>
                </div>
              )}
            </Card>

            {/* Card 3: Primary Code Language (Visible when Technical) */}
            {domainValue === 'TECHNICAL' && (
              <Card className="p-5 space-y-3 animate-fadeIn">
                <div className="space-y-1">
                  <label
                    htmlFor="manage-workspace-code-language-select"
                    className="block text-xs font-mono font-medium text-text"
                  >
                    Primary Code Language
                  </label>
                  <p className="text-[11px] text-text/60 font-body">
                    Specifies the default code syntax and implementation language for AI summaries, code blocks, and tutoring.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex-1">
                    <Select
                      disabled={(!isOwner && callerRole !== 'ADMIN') || savingField === 'language'}
                      value={languageValue}
                      onValueChange={setLanguageValue}
                    >
                      <SelectTrigger
                        id="manage-workspace-code-language-select"
                        className={cn(
                          (!isOwner && callerRole !== 'ADMIN') && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        <SelectValue placeholder="Select primary language" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREDEFINED_CODE_LANGUAGES.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(isOwner || callerRole === 'ADMIN') && (
                    <Button
                      size="sm"
                      type="button"
                      className="h-10 shrink-0 px-4"
                      onClick={handleSaveLanguage}
                      disabled={
                        languageValue === (workspace?.workspace_code_language || 'Python') ||
                        savingField !== null
                      }
                      isLoading={savingField === 'language'}
                      leftIcon={
                        savedField === 'language' ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      {savedField === 'language' ? 'Language Saved' : 'Save Language'}
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Danger Zone (Owner Only) */}
            {isOwner && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-mono font-bold text-danger flex items-center gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" />
                  Danger Zone
                </h3>

                <div className="rounded-card border border-danger/30 divide-y divide-danger/20 overflow-hidden bg-danger-tint/5">
                  {/* Row 1: Transfer Ownership */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-danger-tint/10 transition-colors">
                    <div>
                      <h4 className="text-xs font-mono font-bold text-text">
                        Transfer ownership
                      </h4>
                      <p className="text-[11px] text-text/60 font-body mt-0.5">
                        Transfer this workspace to another collaborator who will become the primary owner.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (eligibleTransferMembers.length > 0) {
                          setSelectedNewOwnerId(eligibleTransferMembers[0].user_id);
                        }
                        setIsTransferModalOpen(true);
                      }}
                      isLoading={transferMutation.isPending}
                      leftIcon={<ArrowRightLeft className="h-3.5 w-3.5" />}
                      className="shrink-0 text-xs font-mono text-danger border-danger/40 hover:bg-danger-tint hover:border-danger"
                    >
                      Transfer ownership
                    </Button>
                  </div>

                  {/* Row 2: Archive Workspace */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-danger-tint/10 transition-colors">
                    <div>
                      <h4 className="text-xs font-mono font-bold text-text">
                        Archive this workspace
                      </h4>
                      <p className="text-[11px] text-text/60 font-body mt-0.5">
                        Mark this workspace as archived and read-only.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => setIsArchiveDialogOpen(true)}
                      isLoading={archiveWorkspaceMutation.isPending}
                      leftIcon={<Archive className="h-3.5 w-3.5" />}
                      className="shrink-0 text-xs font-mono text-danger border-danger/40 hover:bg-danger-tint hover:border-danger"
                    >
                      Archive this workspace
                    </Button>
                  </div>

                  {/* Row 2: Delete Workspace */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-danger-tint/10 transition-colors">
                    <div>
                      <h4 className="text-xs font-mono font-bold text-text">
                        Delete this workspace
                      </h4>
                      <p className="text-[11px] text-text/60 font-body mt-0.5">
                        Once you delete a workspace, there is no going back. Please be certain.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      type="button"
                      variant="danger"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      isLoading={deleteWorkspaceMutation.isPending}
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      className="shrink-0 text-xs font-mono"
                    >
                      Delete this workspace
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Active Collaborators Section */}
      {activeTab === 'collaborators' && (
        <div className="space-y-8 animate-fadeIn">
          {/* GitHub-style Manage Access Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-lg font-bold text-text">Manage access</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-sand border border-sep-line text-text/70">
                  <Lock className="h-3 w-3 text-text/50" />
                  Private workspace
                </span>
              </div>
              <p className="font-body text-xs text-text/70 mt-1">
                Only collaborators have access to this workspace and its learning materials.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {canManageMembers && (
                <Button
                  variant="primary"
                  onClick={() => setIsInviteModalOpen(true)}
                  leftIcon={<UserPlus className="h-4 w-4" />}
                  className="text-xs py-2 px-3.5"
                  aria-label="Invite Collaborator"
                >
                  Add people
                </Button>
              )}

              {!isOwner && (
                <Button
                  variant="outline"
                  onClick={() => setIsLeaveDialogOpen(true)}
                  leftIcon={<LogOut className="h-4 w-4 text-danger" />}
                  className="text-xs text-danger hover:bg-danger-tint hover:border-danger/40"
                >
                  Leave Workspace
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
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
              <div className="rounded-card border border-sep-line/80 bg-surface overflow-hidden shadow-xs">
                <div className="flex items-center justify-between border-b border-sep-line/60 bg-surface-hover/50 px-4 py-2.5">
                  <span className="font-mono text-xs font-semibold text-text uppercase tracking-wider">
                    Direct access ({filteredMembers.length})
                  </span>
                  {filteredMembers.length !== members.length && (
                    <span className="font-mono text-[11px] text-text/50">
                      Filtered from {members.length} total
                    </span>
                  )}
                </div>

                <div className="divide-y divide-sep-line/60">
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
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-surface-hover/40 transition-colors"
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
                          {/* Instant Inline Role Selector */}
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
                                    onClick={() => handleRoleChange(member.membership_id || member.id || member.user_id, 'ADMIN', member.version)}
                                    className="flex items-center justify-between text-xs font-mono py-1.5 cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Shield className="h-3.5 w-3.5 text-amber-500" />
                                      <span>ADMIN</span>
                                    </div>
                                    {member.role === 'ADMIN' && <Check className="h-3.5 w-3.5 text-accent" />}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(member.membership_id || member.id || member.user_id, 'EDITOR', member.version)}
                                  className="flex items-center justify-between text-xs font-mono py-1.5 cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <Edit3 className="h-3.5 w-3.5 text-accent" />
                                    <span>EDITOR</span>
                                  </div>
                                  {member.role === 'EDITOR' && <Check className="h-3.5 w-3.5 text-accent" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(member.membership_id || member.id || member.user_id, 'VIEWER', member.version)}
                                  className="flex items-center justify-between text-xs font-mono py-1.5 cursor-pointer"
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
                </div>
              </div>
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
              <div className="rounded-card border border-sep-line/80 bg-surface overflow-hidden shadow-xs divide-y divide-sep-line/60">
                {filteredInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-surface-hover/40 transition-colors"
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
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/30">
                            <Clock className="h-2.5 w-2.5" />
                            Pending Invite
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
              </div>
            )}
          </div>

      {/* 4. Activity & Audit Trail Section */}
      <div className="space-y-4 pt-6 border-t border-sep-line">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-text flex items-center gap-2">
              <LogsIcon className="h-4 w-4 text-accent" />
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

      {/* Archive Workspace Confirmation Modal */}
      <ConfirmDialog
        open={isArchiveDialogOpen}
        onOpenChange={setIsArchiveDialogOpen}
        title="Archive Workspace"
        description={`Are you sure you want to archive "${workspace.name}"? The workspace will become read-only and will be moved to your Archived Workspaces list.`}
        confirmText="Archive Workspace"
        cancelText="Cancel"
        variant="primary"
        isLoading={archiveWorkspaceMutation.isPending}
        onConfirm={() => archiveWorkspaceMutation.mutate(workspace.id)}
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
          if (memberToRemove) removeMutation.mutate(memberToRemove.membership_id || memberToRemove.id || memberToRemove.user_id);
        }}
      />

      {/* Transfer Ownership Modal (Danger Zone) */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-danger flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Transfer Workspace Ownership
            </DialogTitle>
            <DialogDescription>
              Transfer primary ownership of <span className="font-semibold text-text">{workspace.name}</span> to an active collaborator. You will become a regular member.
            </DialogDescription>
          </DialogHeader>

          {eligibleTransferMembers.length === 0 ? (
            <div className="py-4 text-center space-y-3">
              <p className="text-xs font-mono text-text/60">
                There are no other active collaborators in this workspace. Invite a collaborator first before transferring ownership.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsTransferModalOpen(false);
                  setIsInviteModalOpen(true);
                }}
                leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                className="text-xs font-mono"
              >
                Invite Collaborator
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (selectedNewOwnerId) {
                  transferMutation.mutate(selectedNewOwnerId, {
                    onSuccess: () => {
                      setIsTransferModalOpen(false);
                    },
                  });
                }
              }}
              className="space-y-4 py-2"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-text">
                  Select New Owner
                </label>
                <Select
                  value={selectedNewOwnerId}
                  onValueChange={setSelectedNewOwnerId}
                >
                  <SelectTrigger className="w-full text-xs font-mono">
                    <SelectValue placeholder="Choose a collaborator..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleTransferMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id} className="text-xs font-mono">
                        {m.user_name || m.user_email} ({m.user_email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-ui bg-danger-tint/10 border border-danger/20 p-3 text-[11px] font-body text-danger">
                <strong>Warning:</strong> This action cannot be undone by you once transferred. Only the new owner can transfer ownership back.
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTransferModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  isLoading={transferMutation.isPending}
                  disabled={!selectedNewOwnerId}
                  leftIcon={<ArrowRightLeft className="h-3.5 w-3.5" />}
                >
                  Transfer Ownership
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
