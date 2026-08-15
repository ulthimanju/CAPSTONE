import apiClient from '@/lib/api';

export const notificationApi = {
  /**
   * Fetches the user's notifications with unread count from MongoDB.
   */
  getNotifications: async ({ limit = 50, offset = 0 } = {}) => {
    const response = await apiClient.get('/api/v1/notifications', {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Marks a specific notification as READ in MongoDB.
   */
  markAsRead: async (notificationId) => {
    const response = await apiClient.patch(`/api/v1/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Marks all unread notifications for current user as READ in MongoDB.
   */
  markAllAsRead: async () => {
    const response = await apiClient.patch('/api/v1/notifications/read-all');
    return response.data;
  },
};

export default notificationApi;
