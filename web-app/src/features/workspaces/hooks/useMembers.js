import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberApi } from '../api/memberApi';
import { STORAGE_KEYS } from '@/config/constants';

export const memberKeys = {
  all: ['workspace-members'],
  members: (workspaceId) => [...memberKeys.all, 'list', workspaceId],
  invitations: (workspaceId) => [...memberKeys.all, 'invitations', workspaceId],
  activities: (workspaceId) => [...memberKeys.all, 'activities', workspaceId],
};

/**
 * Hook to subscribe to workspace SSE events for real-time collaborator updates.
 */
export function useWorkspaceMemberSSE(workspaceId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId || typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      return;
    }

    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const sseUrl = `${baseURL}/api/v1/workspaces/${workspaceId}/events${tokenParam}`;

    let eventSource;
    try {
      eventSource = new EventSource(sseUrl, { withCredentials: true });

      const handleEvent = () => {
        try {
          queryClient.invalidateQueries({ queryKey: memberKeys.all });
          queryClient.refetchQueries({ queryKey: memberKeys.all });
        } catch {}
      };

      eventSource.onmessage = handleEvent;
      eventSource.addEventListener('workspace.member.invited', handleEvent);
      eventSource.addEventListener('workspace.member.joined', handleEvent);
      eventSource.addEventListener('workspace.member.removed', handleEvent);
      eventSource.addEventListener('workspace.member.role_updated', handleEvent);
      eventSource.addEventListener('workspace.invitation.canceled', handleEvent);
      eventSource.addEventListener('workspace.invitation.rejected', handleEvent);
      eventSource.addEventListener('workspace.ownership.transferred', handleEvent);
      eventSource.addEventListener('workspace.activity', handleEvent);

      return () => {
        eventSource.close();
      };
    } catch {
      return () => {};
    }
  }, [workspaceId, queryClient]);
}

/**
 * Hook to fetch members of a workspace.
 */
export function useMembersQuery(workspaceId, options = {}) {
  return useQuery({
    queryKey: memberKeys.members(workspaceId),
    queryFn: () => memberApi.getMembers(workspaceId),
    enabled: !!workspaceId,
    staleTime: 1000 * 5,
    ...options,
  });
}

/**
 * Hook to fetch pending invitations for a workspace.
 */
export function useInvitationsQuery(workspaceId, options = {}) {
  return useQuery({
    queryKey: memberKeys.invitations(workspaceId),
    queryFn: () => memberApi.getInvitations(workspaceId),
    enabled: !!workspaceId,
    staleTime: 1000 * 5,
    ...options,
  });
}

/**
 * Hook to fetch recent workspace activities / audit trail.
 */
export function useWorkspaceActivitiesQuery(workspaceId, limit = 50, options = {}) {
  return useQuery({
    queryKey: memberKeys.activities(workspaceId),
    queryFn: () => memberApi.getActivities(workspaceId, limit),
    enabled: !!workspaceId,
    staleTime: 1000 * 5,
    ...options,
  });
}

/**
 * Mutation hook to invite a collaborator.
 */
export function useInviteMemberMutation(workspaceId, options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => memberApi.inviteMember(workspaceId, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      queryClient.refetchQueries({ queryKey: memberKeys.all });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Mutation hook to remove a member.
 */
export function useRemoveMemberMutation(workspaceId, options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId) => memberApi.removeMember(workspaceId, userId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      queryClient.refetchQueries({ queryKey: memberKeys.all });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Mutation hook to update a member's role.
 */
export function useUpdateMemberRoleMutation(workspaceId, options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role, version }) => memberApi.updateMemberRole(workspaceId, userId, role, version),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      queryClient.refetchQueries({ queryKey: memberKeys.all });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Mutation hook to resend an invitation (extends 7 days).
 */
export function useResendInvitationMutation(workspaceId, options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId) => memberApi.resendInvitation(invitationId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      queryClient.refetchQueries({ queryKey: memberKeys.all });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Mutation hook to cancel an invitation.
 */
export function useCancelInvitationMutation(workspaceId, options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId) => memberApi.cancelInvitation(invitationId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      queryClient.refetchQueries({ queryKey: memberKeys.all });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Mutation hook to leave a workspace (non-owners).
 */
export function useLeaveWorkspaceMutation(workspaceId, options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => memberApi.leaveWorkspace(workspaceId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Mutation hook to transfer workspace ownership.
 */
export function useTransferOwnershipMutation(workspaceId, options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newOwnerId) => memberApi.transferOwnership(workspaceId, newOwnerId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      queryClient.refetchQueries({ queryKey: memberKeys.all });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}
