import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationApi } from '../api/notificationApi';
import { useAuthStore } from '@/store/authStore';

export const notificationKeys = {
  all: ['notifications'],
  list: (filters) => [...notificationKeys.all, 'list', filters],
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

          const wsId = payload.workspace_id || payload.metadata?.workspace_id;
          const docId = payload.document_id || payload.resource_id || payload.metadata?.document_id;
          const eventType = (payload.event_type || payload.event_name || payload.type || '').toLowerCase();

          // 1. Invalidate and immediately refetch notifications
          queryClient.invalidateQueries({ queryKey: notificationKeys.all });
          queryClient.refetchQueries({ queryKey: notificationKeys.all });
          queryClient.invalidateQueries({ queryKey: ['user-pending-invitations'] });
          queryClient.refetchQueries({ queryKey: ['user-pending-invitations'] });

          // 2. Invalidate workspace lists and active workspace details
          queryClient.invalidateQueries({ queryKey: ['workspaces'] });

          if (wsId) {
            queryClient.invalidateQueries({ queryKey: ['workspaces', 'detail', wsId] });
            queryClient.invalidateQueries({ queryKey: ['documents', 'workspace', wsId] });
            queryClient.invalidateQueries({ queryKey: ['workspace-members', 'list', wsId] });
            queryClient.invalidateQueries({ queryKey: ['workspace-members', 'invitations', wsId] });
            queryClient.invalidateQueries({ queryKey: ['workspace-members', 'activities', wsId] });
            queryClient.invalidateQueries({ queryKey: ['workspace-summary', wsId] });
            queryClient.invalidateQueries({ queryKey: ['workspace-learning-path', wsId] });
          }

          // 3. Invalidate specific document details if document event
          if (docId) {
            queryClient.invalidateQueries({ queryKey: ['documents', 'detail', docId] });
            queryClient.invalidateQueries({ queryKey: ['documents', 'parse-result', docId] });
          }

          // 4. Invalidate auth sessions if session-related event
          if (eventType.includes('session') || eventType.includes('auth')) {
            queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
          }

          // 5. Display real-time toast alert for actionable notifications
          const eventName = payload.event_name || payload.title || '';
          const title = payload.title || (eventName ? eventName.replace(/([A-Z])/g, ' $1').trim() : 'Notification');
          const message = payload.message || payload.description || '';
          const toastKey = payload.event_id || `${eventName}-${payload.resource_id || wsId || docId || title}`;

          if (message || title) {
            const isSuccess =
              payload.status === 'COMPLETED' ||
              eventType.includes('completed') ||
              eventType.includes('joined') ||
              eventType.includes('restored') ||
              eventName.toLowerCase().includes('parsed') ||
              eventName.toLowerCase().includes('indexed');

            const isError =
              payload.status === 'FAILED' ||
              eventType.includes('failed') ||
              eventType.includes('error');

            if (isSuccess) {
              toast.success(title, {
                id: toastKey,
                description: message,
                duration: 4000,
              });
            } else if (isError) {
              toast.error(title, {
                id: toastKey,
                description: message,
                duration: 5500,
              });
            } else {
              toast(title, {
                id: toastKey,
                description: message,
                duration: 4000,
              });
            }
          }
        } catch (err) {
          console.debug('Notification SSE parse error:', err);
        }
      };

      eventSource.onmessage = handleNotification;
      eventSource.addEventListener('message', handleNotification);
      eventSource.addEventListener('notification', handleNotification);
      eventSource.addEventListener('WorkspaceInvitationSent', handleNotification);
      eventSource.addEventListener('WorkspaceArchived', handleNotification);
      eventSource.addEventListener('WorkspaceRestored', handleNotification);
      eventSource.addEventListener('MemberJoined', handleNotification);
      eventSource.addEventListener('DocumentParsed', handleNotification);

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
 * Hook to mark a notification as read with instant cache update.
 */
export function useMarkNotificationReadMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId) => notificationApi.markAsRead(notificationId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.refetchQueries({ queryKey: notificationKeys.all });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Hook to mark all notifications as read with instant cache update.
 */
export function useMarkAllNotificationsReadMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.refetchQueries({ queryKey: notificationKeys.all });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

export default useNotificationsQuery;
