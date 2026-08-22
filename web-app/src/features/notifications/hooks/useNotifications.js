import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationApi } from '../api/notificationApi';
import { useAuthStore } from '@/store/authStore';
import { workspaceKeys } from '@/features/workspaces/hooks/workspaceKeys';
import { documentKeys } from '@/features/documents/hooks/documentKeys';
import { learningPathKeys } from '@/features/learning-path/hooks/learningPathKeys';

export const notificationKeys = {
  all: ['notifications'],
  list: (filters) => [...notificationKeys.all, 'list', filters],
};

const sseInvalidationMap = {
  'workspace.updated': (id) => [workspaceKeys.detail(id), workspaceKeys.lists()],
  'workspace.collaborator_joined': (id) => [workspaceKeys.members(id)],
  'workspace.member_removed': (id) => [workspaceKeys.members(id)],
  'workspace.member_role_updated': (id) => [workspaceKeys.members(id)],
  'workspace.ownership.transferred': (id) => [workspaceKeys.detail(id), workspaceKeys.lists(), workspaceKeys.members(id)],
  'workspace.archived': (id) => [workspaceKeys.detail(id), workspaceKeys.lists(), workspaceKeys.archived()],
  'workspace.restored': (id) => [workspaceKeys.detail(id), workspaceKeys.lists(), workspaceKeys.archived()],
  'workspace.deleted': (id) => [workspaceKeys.detail(id), workspaceKeys.lists(), workspaceKeys.archived()],
  'WorkspaceArchived': (id) => [workspaceKeys.detail(id), workspaceKeys.lists(), workspaceKeys.archived()],
  'WorkspaceRestored': (id) => [workspaceKeys.detail(id), workspaceKeys.lists(), workspaceKeys.archived()],
  'MemberJoined': (id) => [workspaceKeys.members(id)],
};

/**
 * Hook to fetch user notifications from MongoDB with real-time SSE updates.
 * staleTime is 0 so any invalidation triggers immediate re-render and query update.
 */
export function useNotificationsQuery({ limit = 50, offset = 0 } = {}, options = {}) {
  return useQuery({
    queryKey: notificationKeys.list({ limit, offset }),
    queryFn: () => notificationApi.getNotifications({ limit, offset }),
    staleTime: 0,
    ...options,
  });
}

/**
 * Formats a clean, human-friendly title for real-time SSE toast alerts.
 */
function formatFriendlyToastTitle(payload) {
  const meta = { ...(payload || {}), ...(payload.metadata || {}) };
  const rawType = (payload.event_type || payload.event_name || payload.type || payload.title || '').toLowerCase();
  const docName = meta.document_name || meta.original_filename || meta.filename || meta.name || 'Document';
  const unitTitle = meta.unit_title || 'Study Unit';
  const email = meta.invited_email || meta.member_email || meta.user_email || meta.email;
  const actor = meta.actor_name || email || 'Member';
  const role = (meta.new_role || meta.role || '').replace('WorkspaceRole.', '').toUpperCase();

  if (rawType.includes('indexing.completed') || rawType.includes('vectorindexing') || rawType.includes('document.indexed')) {
    return `"${docName}" document has been processed successfully`;
  }
  if (rawType.includes('document.uploaded') || rawType.includes('document.created')) {
    return `"${docName}" document has been uploaded successfully`;
  }
  if (rawType.includes('document.parsed') || rawType.includes('documentparsing')) {
    return `"${docName}" document has been analyzed successfully`;
  }
  if (rawType.includes('document.failed') || rawType.includes('indexing.failed')) {
    return `"${docName}" document processing failed`;
  }
  if (rawType.includes('document.deleted')) {
    return `"${docName}" document has been removed`;
  }
  if (rawType.includes('summarygeneration') || rawType.includes('summary')) {
    return '"Executive Summary" has been generated successfully';
  }
  if (rawType.includes('learningpathgeneration') || rawType.includes('learning_path')) {
    return '"Adaptive Learning Path" has been generated successfully';
  }
  if (rawType.includes('learningunitgeneration') || rawType.includes('unit')) {
    return `"${unitTitle}" study unit has been synthesized successfully`;
  }
  if (rawType.includes('member_invited') || rawType.includes('invitation')) {
    return `Invitation sent to ${email || 'collaborator'}`;
  }
  if (rawType.includes('member_joined') || rawType.includes('collaborator_joined')) {
    return `${actor} joined the workspace`;
  }
  if (rawType.includes('role_updated') || rawType.includes('member.role')) {
    return `${actor} role updated to ${role || 'collaborator'}`;
  }
  if (rawType.includes('member_removed') || rawType.includes('member.removed')) {
    return `${actor} was removed from the workspace`;
  }
  if (rawType.includes('member_left') || rawType.includes('member.left')) {
    return `${actor} left the workspace`;
  }
  if (rawType.includes('ownership_transferred')) {
    const newOwner = meta.new_owner_name || meta.new_owner_email || 'new owner';
    return `Workspace ownership transferred to ${newOwner}`;
  }
  if (rawType.includes('workspace.created')) {
    return 'Workspace created successfully';
  }
  if (rawType.includes('workspace.archived')) {
    return 'Workspace has been archived';
  }
  if (rawType.includes('workspace.restored')) {
    return 'Workspace has been restored';
  }
  if (rawType.includes('workspace.deleted')) {
    return 'Workspace has been deleted';
  }

  const clean = (payload.title || rawType)
    .replace(/EventStatus\./gi, '')
    .replace(/WorkspaceRole\./gi, '')
    .replace(/event\s+/gi, '')
    .replace(/[._]/g, ' ')
    .trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Real-time SSE subscription hook for live notification stream.
 * Automatically invalidates notification & invitation caches and displays toast alerts.
 */
export function useNotificationSSE() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!token || typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      return;
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const sseUrl = `${apiBase}/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;

    let eventSource;
    try {
      eventSource = new EventSource(sseUrl, { withCredentials: true });
      eventSourceRef.current = eventSource;

      const handleNotification = (event) => {
        try {
          if (!event.data) return;
          const payload = JSON.parse(event.data);
          if (payload.status === 'CONNECTED' || payload.event_name === 'Ping') {
            return;
          }

          const currentUserId = useAuthStore.getState().user?.id || useAuthStore.getState().user?.sub;
          const actorId = payload.actor_id || payload.metadata?.actor_id || payload.user_id;
          const isOriginatingActor = Boolean(actorId && currentUserId && String(actorId) === String(currentUserId));

          const wsId = payload.workspace_id || payload.metadata?.workspace_id;
          const docId = payload.document_id || payload.resource_id || payload.metadata?.document_id;
          const rawEventType = payload.event_type || payload.event_name || payload.type || '';
          const eventType = rawEventType.toLowerCase();

          // 1. Invalidate and immediately refetch notifications & pending invitations
          queryClient.invalidateQueries({ queryKey: notificationKeys.all });
          queryClient.refetchQueries({ queryKey: notificationKeys.all });
          queryClient.invalidateQueries({ queryKey: ['user-pending-invitations'] });
          queryClient.refetchQueries({ queryKey: ['user-pending-invitations'] });

          // 2. Perform scoped workspace invalidation only if NOT originating actor
          if (!isOriginatingActor) {
            const getKeysToInvalidate = sseInvalidationMap[rawEventType] || sseInvalidationMap[eventType];
            if (getKeysToInvalidate && wsId) {
              const keys = getKeysToInvalidate(wsId);
              keys.forEach((queryKey) => {
                queryClient.invalidateQueries({ queryKey });
              });
            } else if (eventType.startsWith('workspace.')) {
              console.warn(`[SSE] Unmapped workspace event received: ${rawEventType}`);
            }
          }

          // 3. Invalidate specific document details if document event
          if (docId) {
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(docId) });
            queryClient.invalidateQueries({ queryKey: documentKeys.parseResult(docId) });
          }
          if (wsId && (eventType.includes('document') || eventType.includes('summary') || eventType.includes('learning_path'))) {
            queryClient.invalidateQueries({ queryKey: documentKeys.workspaceList(wsId) });
            queryClient.invalidateQueries({ queryKey: ['workspace-summary', wsId] });
            queryClient.invalidateQueries({ queryKey: learningPathKeys.path(wsId) });
          }

          // 4. Invalidate auth sessions if session-related event
          if (eventType.includes('session') || eventType.includes('auth')) {
            queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
          }

          // 5. Display real-time toast alert only when not already notified by an interactive mutation
          const isInteractiveUserAction =
            isOriginatingActor &&
            (eventType.includes('joined') ||
              eventType.includes('invited') ||
              eventType.includes('invitation') ||
              eventType.includes('archived') ||
              eventType.includes('restored') ||
              eventType.includes('deleted') ||
              eventType.includes('role_updated') ||
              eventType.includes('uploaded'));

          if (!isInteractiveUserAction) {
            const title = formatFriendlyToastTitle(payload);
            const toastKey = payload.event_id || `${eventType}-${payload.resource_id || wsId || docId || title}`;

            const isSuccess =
              payload.status === 'COMPLETED' ||
              eventType.includes('completed') ||
              eventType.includes('joined') ||
              eventType.includes('restored') ||
              eventType.includes('indexed') ||
              eventType.includes('parsed');

            const isError =
              payload.status === 'FAILED' ||
              eventType.includes('failed') ||
              eventType.includes('error');

            if (isSuccess) {
              toast.success(title, {
                id: toastKey,
                duration: 3500,
              });
            } else if (isError) {
              toast.error(title, {
                id: toastKey,
                duration: 4000,
              });
            } else {
              toast(title, {
                id: toastKey,
                duration: 3500,
              });
            }
          }
        } catch (err) {
          console.debug('Notification SSE parse error:', err);
        }
      };

      eventSource.onmessage = handleNotification;

      eventSource.onerror = (err) => {
        console.debug('Notification SSE connection state:', eventSource.readyState, err);
      };
    } catch (err) {
      console.error('Failed to initialize Notification SSE:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      eventSourceRef.current = null;
    };
  }, [token, queryClient]);
}

/**
 * REFERENCE IMPLEMENTATION: Zero-Read Optimistic Mutation Pattern
 * 
 * 1. onMutate:
 *    - Cancels outgoing refetches for the target key family.
 *    - Captures snapshot of previous query data for all matching shapes.
 *    - Optimistically applies update directly to cache via setQueriesData.
 *    - Returns { previousData } for rollback on failure.
 * 2. onSuccess:
 *    - Skips invalidateQueries / refetchQueries entirely since cache was already updated optimistically.
 *    - Zero background GET requests are dispatched.
 * 3. onError:
 *    - Restores previous snapshot data via setQueryData if request fails.
 */

/**
 * Hook to mark a single notification as read with instant zero-read cache update and automatic rollback.
 */
export function useMarkNotificationReadMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId) => notificationApi.markAsRead(notificationId),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previousData = queryClient.getQueriesData({ queryKey: notificationKeys.all });

      // Optimistically update all notification queries matching notificationKeys.all
      queryClient.setQueriesData({ queryKey: notificationKeys.all }, (old) => {
        if (!old) return old;
        return {
          ...old,
          unread_count: Math.max(0, (old.unread_count || 1) - 1),
          notifications: Array.isArray(old.notifications)
            ? old.notifications.map((n) =>
                n.id === notificationId || n._id === notificationId ? { ...n, status: 'READ' } : n
              )
            : [],
        };
      });

      return { previousData };
    },
    onSuccess: (data, variables, context) => {
      // Zero-read: no invalidateQueries/refetchQueries needed
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Rollback to previous cache snapshot on network/server error
      if (context?.previousData) {
        context.previousData.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Hook to mark all notifications as read with instant zero-read cache update and automatic rollback.
 */
export function useMarkAllNotificationsReadMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previousData = queryClient.getQueriesData({ queryKey: notificationKeys.all });

      // Optimistically mark all notifications as READ and set unread_count to 0
      queryClient.setQueriesData({ queryKey: notificationKeys.all }, (old) => {
        if (!old) return old;
        return {
          ...old,
          unread_count: 0,
          notifications: Array.isArray(old.notifications)
            ? old.notifications.map((n) => ({ ...n, status: 'READ' }))
            : [],
        };
      });

      return { previousData };
    },
    onSuccess: (data, variables, context) => {
      // Zero-read: no invalidateQueries/refetchQueries needed
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Rollback to previous cache snapshot on network/server error
      if (context?.previousData) {
        context.previousData.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

export default useNotificationsQuery;
