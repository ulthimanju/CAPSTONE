/**
 * CollaboratorsSection — Business Logic Layer
 *
 * Handles listing workspace members, inviting new collaborators, and removing members.
 * Uses stable userRef and runs effects cleanly per workspaceId lifecycle.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/services/api/client';
import { useAuth } from '@/hooks/useAuth';

export function useCollaboratorsSection(workspaceId) {
  const { user } = useAuth();

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

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
      if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
      if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

      const res = await apiClient.get(`/api/v1/workspaces/${workspaceId}/members`, { headers });
      setMembersData(res.data);
    } catch (err) {
      console.error('[CollaboratorsSection] Failed to fetch members:', err);
      setError(err?.response?.data || err?.message || 'Failed to load collaborators');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  const handleInviteCollaborator = useCallback(async () => {
    if (!workspaceId || !inviteEmail.trim()) return;
    setIsInviting(true);
    setError(null);

    try {
      const headers = {};
      if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
      if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

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
  }, [workspaceId, inviteEmail, inviteRole, fetchMembers]);

  const handleRemoveMember = useCallback(
    async (memberUserId) => {
      if (!workspaceId || !memberUserId) return;
      setError(null);

      try {
        const headers = {};
        if (userRef.current?.id) headers['X-User-ID'] = userRef.current.id;
        if (userRef.current?.email) headers['X-User-Email'] = userRef.current.email;

        await apiClient.delete(`/api/v1/workspaces/${workspaceId}/members/${memberUserId}`, { headers });
        await fetchMembers();
      } catch (err) {
        console.error('[CollaboratorsSection] Remove member failed:', err);
        setError(err?.response?.data || err?.message || 'Failed to remove member');
      }
    },
    [workspaceId, fetchMembers]
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
