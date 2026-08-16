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
 * Hook to fetch user notifications from MongoDB with zero polling.
 * Query invalidation is driven in real-time by the SSE notification stream.
 */
export function useNotificationsQuery({ limit = 50, offset = 0 } = {}, options = {}) {
  return useQuery({
    queryKey: notificationKeys.list({ limit, offset }),
    queryFn: () => notificationApi.getNotifications({ limit, offset }),
    staleTime: Infinity, // Real-time SSE updates manage cache invalidation
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

          // Invalidate notifications queries
          queryClient.invalidateQueries({ queryKey: notificationKeys.all });

          // Invalidate invitations query if notification is an invitation event
          if (
            payload.event_type?.includes('invitation') ||
            payload.event_name?.includes('Invitation') ||
            payload.type === 'INVITATION'
          ) {
            queryClient.invalidateQueries({ queryKey: ['workspaces', 'invitations'] });
          }

          // Display real-time toast alert
          const title = payload.title || payload.event_name || 'New Notification';
          const message = payload.message || payload.description || '';
          if (message || title) {
            toast.info(title, {
              description: message,
              duration: 5000,
            });
          }
        } catch (err) {
          console.debug('Notification SSE parse error:', err);
        }
      };

      eventSource.onmessage = handleNotification;
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
 * Hook to mark a notification as read.
 */
export function useMarkNotificationReadMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId) => notificationApi.markAsRead(notificationId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Hook to mark all notifications as read.
 */
export function useMarkAllNotificationsReadMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

export default useNotificationsQuery;
