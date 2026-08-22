import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  Clock,
  Envelope,
  FileText,
  Sparkle,
  Archive,
  ArrowCounterClockwise,
  PencilSimple,
  UserPlus,
  UserMinus,
  Trash,
  Folder,
  Compass,
  CheckCircle,
} from '@/components/ui/icons';
import {
  useNotificationsQuery,
  useNotificationSSE,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../hooks/useNotifications';
import { useWorkspacesQuery } from '@/features/workspaces/hooks/useWorkspaces';
import { Card, Button, BookLinearIcon } from '@/components/ui';
import { toast } from 'sonner';

/**
 * Transforms raw machine event titles/messages into clean, friendly human text.
 */
function formatFriendlyNotification(item, workspaceMap = {}) {
  const meta = { ...(item.payload || {}), ...(item.metadata || {}) };
  const rawType = (item.event_type || item.type || item.title || '').toLowerCase();
  const rawTitle = (item.title || '').toLowerCase();
  const rawMsg = (item.message || '').toLowerCase();

  const wsName =
    item.workspace_name ||
    meta.workspace_name ||
    (item.workspace_id ? workspaceMap[item.workspace_id]?.name : null);

  const docName =
    meta.document_name ||
    meta.original_filename ||
    meta.filename ||
    meta.name ||
    'Document';

  const unitTitle = meta.unit_title || 'Study Unit';
  const email = meta.invited_email || meta.member_email || meta.user_email || meta.email;
  const actor = meta.actor_name || email || 'Member';
  const role = (meta.new_role || meta.role || '').replace('WorkspaceRole.', '').toUpperCase();

  // 1. Document Indexing / Processing Completed
  if (
    rawType.includes('indexing.completed') ||
    rawType.includes('vectorindexing') ||
    rawType.includes('document.indexed') ||
    rawTitle.includes('indexing.completed') ||
    rawMsg.includes('indexing.completed')
  ) {
    return {
      title: `"${docName}" document has been processed successfully`,
      message: 'Vector embeddings and semantic indexing are ready for AI tutoring.',
      workspaceName: wsName,
      icon: 'document-done',
    };
  }

  // 2. Document Uploaded
  if (rawType.includes('document.uploaded') || rawType.includes('document.created')) {
    return {
      title: `"${docName}" document has been uploaded successfully`,
      message: 'Document is being analyzed and parsed into learning materials.',
      workspaceName: wsName,
      icon: 'document',
    };
  }

  // 3. Document Parsed
  if (rawType.includes('document.parsed') || rawType.includes('documentparsing')) {
    return {
      title: `"${docName}" document has been analyzed successfully`,
      message: 'Markdown structure and diagrams extracted.',
      workspaceName: wsName,
      icon: 'document',
    };
  }

  // 4. Document Processing Failed
  if (rawType.includes('document.failed') || rawType.includes('indexing.failed')) {
    return {
      title: `"${docName}" document processing failed`,
      message: meta.error || 'An error occurred while processing the document.',
      workspaceName: wsName,
      icon: 'error',
    };
  }

  // 5. Document Deleted
  if (rawType.includes('document.deleted')) {
    return {
      title: `"${docName}" document has been removed`,
      message: 'Document and associated vector embeddings were deleted.',
      workspaceName: wsName,
      icon: 'trash',
    };
  }

  // 6. Summary Generated
  if (rawType.includes('summarygeneration') || rawType.includes('summary')) {
    return {
      title: '"Executive Summary" has been generated successfully',
      message: 'Comprehensive study guide and architectural diagrams are ready.',
      workspaceName: wsName,
      icon: 'summary',
    };
  }

  // 7. Learning Path Generated
  if (rawType.includes('learningpathgeneration') || rawType.includes('learning_path')) {
    return {
      title: '"Adaptive Learning Path" has been generated successfully',
      message: 'Structured curriculum and study milestones are ready.',
      workspaceName: wsName,
      icon: 'compass',
    };
  }

  // 8. Learning Unit Generated
  if (rawType.includes('learningunitgeneration') || rawType.includes('unit')) {
    return {
      title: `"${unitTitle}" study unit has been synthesized successfully`,
      message: 'Deep-dive study content and explanations synthesized.',
      workspaceName: wsName,
      icon: 'unit',
    };
  }

  // 9. Collaborator Invited
  if (rawType.includes('member_invited') || rawType.includes('invitation')) {
    return {
      title: `Invitation sent to ${email || 'collaborator'}`,
      message: `Invitation sent to ${email || 'collaborator'}.`,
      workspaceName: wsName,
      icon: 'invite',
    };
  }

  // 10. Collaborator Joined
  if (rawType.includes('member_joined') || rawType.includes('member.joined')) {
    return {
      title: `${actor} joined the workspace`,
      message: `${actor} joined the workspace.`,
      workspaceName: wsName,
      icon: 'user-plus',
    };
  }

  // 11. Member Role Updated
  if (rawType.includes('role_updated') || rawType.includes('member.role')) {
    return {
      title: `${actor} role updated to ${role || 'collaborator'}`,
      message: `Role permissions updated.`,
      workspaceName: wsName,
      icon: 'pencil',
    };
  }

  // 12. Member Removed / Left
  if (rawType.includes('member_removed') || rawType.includes('member.removed')) {
    return {
      title: `${actor} was removed from the workspace`,
      message: `Access to the workspace was revoked.`,
      workspaceName: wsName,
      icon: 'user-minus',
    };
  }

  if (rawType.includes('member_left') || rawType.includes('member.left')) {
    return {
      title: `${actor} left the workspace`,
      message: `Member left the workspace.`,
      workspaceName: wsName,
      icon: 'user-minus',
    };
  }

  // 13. Ownership Transferred
  if (rawType.includes('ownership_transferred')) {
    const newOwner = meta.new_owner_name || meta.new_owner_email || 'new owner';
    return {
      title: `Workspace ownership transferred to ${newOwner}`,
      message: `Primary workspace owner updated.`,
      workspaceName: wsName,
      icon: 'user-plus',
    };
  }

  // 14. Workspace Lifecycle (Created, Archived, Restored, Deleted)
  if (rawType.includes('workspace.created')) {
    return {
      title: 'Workspace created successfully',
      message: 'Workspace is initialized and ready for study documents.',
      workspaceName: wsName,
      icon: 'folder',
    };
  }

  if (rawType.includes('workspace.archived')) {
    return {
      title: 'Workspace has been archived',
      message: 'Workspace was moved to archives.',
      workspaceName: wsName,
      icon: 'archive',
    };
  }

  if (rawType.includes('workspace.restored')) {
    return {
      title: 'Workspace has been restored',
      message: 'Workspace was restored from archives.',
      workspaceName: wsName,
      icon: 'restore',
    };
  }

  if (rawType.includes('workspace.deleted')) {
    return {
      title: 'Workspace has been deleted',
      message: 'Workspace was permanently deleted.',
      workspaceName: wsName,
      icon: 'trash',
    };
  }

  // 15. Fallback clean up
  const cleanTitle = (item.title || 'Notification')
    .replace(/EventStatus\./gi, '')
    .replace(/WorkspaceRole\./gi, '')
    .replace(/event\s+/gi, '')
    .replace(/[._]/g, ' ')
    .trim();

  const isSuccess = cleanTitle.toLowerCase().includes('completed') || cleanTitle.toLowerCase().includes('success');
  const formattedTitle = isSuccess
    ? `"${cleanTitle.replace(/completed|success/gi, '').trim()}" completed successfully`
    : cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

  return {
    title: formattedTitle,
    message: 'Notification updated.',
    workspaceName: wsName,
    icon: 'bell',
  };
}

export function NotificationsPage() {
  // Real-time live SSE notification stream listener
  useNotificationSSE();

  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'

  const { data, isLoading, error } = useNotificationsQuery({ limit: 100 });
  const { data: workspacesData } = useWorkspacesQuery();
  const workspaces = workspacesData?.workspaces || (Array.isArray(workspacesData) ? workspacesData : []);

  const workspaceMap = useMemo(() => {
    const map = {};
    for (const ws of workspaces) {
      if (ws?.id) map[ws.id] = ws;
    }
    return map;
  }, [workspaces]);

  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation({
    onSuccess: () => {
      toast.success('All notifications marked as read');
    },
  });

  const rawNotifications = data?.notifications || [];
  const unreadCount = data?.unread_count ?? rawNotifications.filter((n) => n.status === 'UNREAD').length;

  const filteredNotifications = rawNotifications.filter((n) =>
    filter === 'UNREAD' ? n.status === 'UNREAD' : true
  );

  const renderIcon = (iconKey) => {
    switch (iconKey) {
      case 'document-done':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'document':
        return <FileText className="h-4 w-4 text-accent" />;
      case 'summary':
        return <FileText className="h-4 w-4 text-accent" />;
      case 'compass':
        return <Compass className="h-4 w-4 text-accent" />;
      case 'unit':
        return <BookLinearIcon className="h-4 w-4 text-accent" />;
      case 'archive':
        return <Archive className="h-4 w-4 text-amber-500" />;
      case 'restore':
        return <ArrowCounterClockwise className="h-4 w-4 text-accent" />;
      case 'trash':
        return <Trash className="h-4 w-4 text-danger" />;
      case 'pencil':
        return <PencilSimple className="h-4 w-4 text-accent" />;
      case 'user-plus':
        return <UserPlus className="h-4 w-4 text-accent" />;
      case 'user-minus':
        return <UserMinus className="h-4 w-4 text-danger" />;
      case 'invite':
        return <Envelope className="h-4 w-4 text-accent" />;
      case 'folder':
        return <Folder className="h-4 w-4 text-accent" />;
      default:
        return <Bell className="h-4 w-4 text-accent" />;
    }
  };

  const handleToggleRead = (item) => {
    if (item.status === 'UNREAD') {
      markReadMutation.mutate(item.id);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sep-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-text">Notifications</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] font-bold text-on-accent">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="mt-1 font-body text-xs text-text/70">
            Workspace events, document indexing milestones, and collaborator activities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-ui border border-sep-line bg-surface p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                filter === 'ALL'
                  ? 'bg-sand font-bold text-accent shadow-xs'
                  : 'text-text/70 hover:text-text'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNREAD')}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                filter === 'UNREAD'
                  ? 'bg-sand font-bold text-accent shadow-xs'
                  : 'text-text/70 hover:text-text'
              }`}
            >
              Unread
            </button>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              isLoading={markAllReadMutation.isPending}
              leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-16 text-center text-xs font-mono text-text/60">
          Loading notifications...
        </div>
      )}

      {/* Notifications List */}
      {!isLoading && filteredNotifications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-sep-line py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent">
            <Bell className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-3 font-display text-base font-bold text-text">
            No notifications
          </h3>
          <p className="mt-1 max-w-sm font-body text-xs text-text/70 leading-relaxed">
            {filter === 'UNREAD'
              ? 'You have caught up with all unread notifications.'
              : 'You have no notifications yet.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => {
            const isRead = item.status === 'READ';
            const { title, message, workspaceName, icon } = formatFriendlyNotification(item, workspaceMap);

            return (
              <Card
                key={item.id}
                onClick={() => handleToggleRead(item)}
                className={`cursor-pointer transition-colors p-4 flex items-start justify-between gap-4 border ${
                  isRead
                    ? 'bg-surface/60 border-sep-line/60 opacity-80'
                    : 'bg-surface border-sep-line hover:border-accent shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-ui border ${
                      isRead
                        ? 'bg-sand/40 border-sep-line/40 text-text/50'
                        : 'bg-sand border-sep-line text-accent'
                    }`}
                  >
                    {renderIcon(icon)}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className={`text-xs ${
                          isRead ? 'text-text/80 font-medium' : 'text-text font-bold'
                        }`}
                      >
                        {title}
                      </h4>
                      {!isRead && (
                        <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                      )}
                      {workspaceName && (
                        <span className="inline-flex items-center gap-1 rounded-ui bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-accent border border-accent/25 shadow-2xs">
                          <Folder className="h-2.5 w-2.5 shrink-0" />
                          <span>{workspaceName}</span>
                        </span>
                      )}
                    </div>

                    {/* Metadata details if renamed */}
                    {item.metadata?.old_name && item.metadata?.new_name && (
                      <p className="mt-1 font-mono text-[10px] text-text/60">
                        Renamed from <span className="line-through">{item.metadata.old_name}</span> to <span className="font-semibold text-text">{item.metadata.new_name}</span>
                      </p>
                    )}

                    <div className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-text/50">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(item.created_at || Date.now()).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <span className="font-mono text-[10px] text-text/40 shrink-0">
                  {isRead ? 'Read' : 'Click to mark read'}
                </span>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
