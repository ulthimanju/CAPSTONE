/**
 * InvitationsSection — Business Logic Layer
 *
 * Handles listing pending invitations, accepting, and rejecting invitations.
 * Uses stable userRef and runs effects cleanly.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/services/api/client';
import { useAuth } from '@/hooks/useAuth';

export function useInvitationsSection() {
  const { user } = useAuth();

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [invitationsData, setInvitationsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const headers = {};
      if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
      if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

      const res = await apiClient.get('/api/v1/invitations/pending', { headers });
      setInvitationsData(res.data);
    } catch (err) {
      console.error('[InvitationsSection] Failed to fetch invitations:', err);
      setError(err?.response?.data || err?.message || 'Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAcceptInvitation = useCallback(
    async (invitationId) => {
      if (!invitationId) return;
      setError(null);

      try {
        const headers = {};
        if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
        if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

        await apiClient.post(`/api/v1/invitations/${invitationId}/accept`, {}, { headers });
        await fetchInvitations();
      } catch (err) {
        console.error('[InvitationsSection] Accept invitation failed:', err);
        setError(err?.response?.data || err?.message || 'Failed to accept invitation');
      }
    },
    [fetchInvitations]
  );

  const handleRejectInvitation = useCallback(
    async (invitationId) => {
      if (!invitationId) return;
      setError(null);

      try {
        const headers = {};
        if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
        if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

        await apiClient.post(`/api/v1/invitations/${invitationId}/reject`, {}, { headers });
        await fetchInvitations();
      } catch (err) {
        console.error('[InvitationsSection] Reject invitation failed:', err);
        setError(err?.response?.data || err?.message || 'Failed to reject invitation');
      }
    },
    [fetchInvitations]
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
