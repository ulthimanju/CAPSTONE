/**
 * InvitationsSection — Business Logic Layer
 *
 * Handles listing pending invitations (`GET /api/v1/invitations/pending`),
 * accepting an invitation (`POST /api/v1/invitations/:id/accept`),
 * and rejecting an invitation (`POST /api/v1/invitations/:id/reject`).
 * Directly passes raw received API payload to layout layer.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api/client';
import { useAuth } from '@/hooks/useAuth';

export function useInvitationsSection() {
  const { user } = useAuth();

  const [invitationsData, setInvitationsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const headers = {};
      if (user?.id) headers['X-User-ID'] = user.id;
      if (user?.email) headers['X-User-Email'] = user.email;

      const res = await apiClient.get('/api/v1/invitations/pending', { headers });
      setInvitationsData(res.data);
    } catch (err) {
      console.error('[InvitationsSection] Failed to fetch invitations:', err);
      setError(err?.response?.data || err?.message || 'Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleAcceptInvitation = useCallback(
    async (invitationId) => {
      if (!invitationId) return;
      setError(null);

      try {
        const headers = {};
        if (user?.id) headers['X-User-ID'] = user.id;
        if (user?.email) headers['X-User-Email'] = user.email;

        await apiClient.post(`/api/v1/invitations/${invitationId}/accept`, {}, { headers });
        await fetchInvitations();
      } catch (err) {
        console.error('[InvitationsSection] Accept invitation failed:', err);
        setError(err?.response?.data || err?.message || 'Failed to accept invitation');
      }
    },
    [user, fetchInvitations]
  );

  const handleRejectInvitation = useCallback(
    async (invitationId) => {
      if (!invitationId) return;
      setError(null);

      try {
        const headers = {};
        if (user?.id) headers['X-User-ID'] = user.id;
        if (user?.email) headers['X-User-Email'] = user.email;

        await apiClient.post(`/api/v1/invitations/${invitationId}/reject`, {}, { headers });
        await fetchInvitations();
      } catch (err) {
        console.error('[InvitationsSection] Reject invitation failed:', err);
        setError(err?.response?.data || err?.message || 'Failed to reject invitation');
      }
    },
    [user, fetchInvitations]
  );

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return {
    invitationsData,
    isLoading,
    error,
    refetch: fetchInvitations,
    acceptInvitation: handleAcceptInvitation,
    rejectInvitation: handleRejectInvitation,
  };
}
