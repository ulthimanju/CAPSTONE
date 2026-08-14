/**
 * CollaboratorsSection — Business Logic Layer
 *
 * Handles listing workspace members (`GET /api/v1/workspaces/:id/members`),
 * inviting new collaborators (`POST /api/v1/workspaces/:id/members`),
 * and removing members (`DELETE /api/v1/workspaces/:id/members/:memberUserId`).
 * Directly passes raw received API payload to layout layer.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api/client';
import { useAuth } from '@/hooks/useAuth';

export function useCollaboratorsSection(workspaceId) {
  const { user } = useAuth();

  const [membersData, setMembersData] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState(null);

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);

    try {
      const headers = {};
      if (user?.id) headers['X-User-ID'] = user.id;
      if (user?.email) headers['X-User-Email'] = user.email;

      const res = await apiClient.get(`/api/v1/workspaces/${workspaceId}/members`, { headers });
      setMembersData(res.data);
    } catch (err) {
      console.error('[CollaboratorsSection] Failed to fetch members:', err);
      setError(err?.response?.data || err?.message || 'Failed to load collaborators');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, user]);

  const handleInviteCollaborator = useCallback(async () => {
    if (!workspaceId || !inviteEmail.trim()) return;
    setIsInviting(true);
    setError(null);

    try {
      const headers = {};
      if (user?.id) headers['X-User-ID'] = user.id;
      if (user?.email) headers['X-User-Email'] = user.email;

      await apiClient.post(
        `/api/v1/workspaces/${workspaceId}/members`,
        {
          email: inviteEmail.trim(),
          role: inviteRole,
        },
        { headers }
      );
      setInviteEmail('');
      await fetchMembers();
    } catch (err) {
      console.error('[CollaboratorsSection] Invite failed:', err);
      setError(err?.response?.data || err?.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  }, [workspaceId, inviteEmail, inviteRole, user, fetchMembers]);

  const handleRemoveMember = useCallback(
    async (memberUserId) => {
      if (!workspaceId || !memberUserId) return;
      setError(null);

      try {
        const headers = {};
        if (user?.id) headers['X-User-ID'] = user.id;
        if (user?.email) headers['X-User-Email'] = user.email;

        await apiClient.delete(`/api/v1/workspaces/${workspaceId}/members/${memberUserId}`, { headers });
        await fetchMembers();
      } catch (err) {
        console.error('[CollaboratorsSection] Remove member failed:', err);
        setError(err?.response?.data || err?.message || 'Failed to remove member');
      }
    },
    [workspaceId, user, fetchMembers]
  );

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    membersData,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    isLoading,
    isInviting,
    error,
    refetch: fetchMembers,
    inviteCollaborator: handleInviteCollaborator,
    removeMember: handleRemoveMember,
  };
}
