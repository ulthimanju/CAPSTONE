import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';

export const notificationKeys = {
  all: ['notifications'],
  list: (filters) => [...notificationKeys.all, 'list', filters],
};

/**
 * Hook to fetch user notifications from MongoDB.
 */
export function useNotificationsQuery({ limit = 50, offset = 0 } = {}, options = {}) {
  return useQuery({
    queryKey: notificationKeys.list({ limit, offset }),
    queryFn: () => notificationApi.getNotifications({ limit, offset }),
    staleTime: 1000 * 30, // 30 seconds
    ...options,
  });
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
