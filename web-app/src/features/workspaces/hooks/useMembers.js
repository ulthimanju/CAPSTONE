import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberApi } from '../api/memberApi';
import { workspaceKeys } from './workspaceKeys';
import { useAuthStore } from '@/store/authStore';

export const memberKeys = {
  all: ['workspace-members'],
  members: (workspaceId) => workspaceKeys.members(workspaceId),
  invitations: (workspaceId) => [...memberKeys.all, 'invitations', workspaceId],
  activities: (workspaceId, page = 1, limit = 10) => [...memberKeys.all, 'activities', workspaceId, page, limit],
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
    const token = useAuthStore.getState().token;
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const sseUrl = `${baseURL}/api/v1/workspaces/${workspaceId}/events${tokenParam}`;

    let eventSource;
    try {
      eventSource = new EventSource(sseUrl, { withCredentials: true });

      const handleMemberEvent = () => {
        try {
          queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
          queryClient.invalidateQueries({ queryKey: memberKeys.invitations(workspaceId) });
          queryClient.invalidateQueries({ queryKey: memberKeys.activities(workspaceId) });
        } catch {}
      };

      eventSource.onmessage = handleMemberEvent;
      eventSource.addEventListener('workspace.member.invited', handleMemberEvent);
      eventSource.addEventListener('workspace.member.joined', handleMemberEvent);
      eventSource.addEventListener('workspace.member.removed', handleMemberEvent);
      eventSource.addEventListener('workspace.member.role_updated', handleMemberEvent);
      eventSource.addEventListener('workspace.invitation.canceled', handleMemberEvent);
      eventSource.addEventListener('workspace.invitation.rejected', handleMemberEvent);
      eventSource.addEventListener('workspace.ownership.transferred', () => {
        queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
        queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
        queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
      });
      eventSource.addEventListener('workspace.activity', () => {
        queryClient.invalidateQueries({ queryKey: memberKeys.activities(workspaceId) });
      });

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
 * Hook to fetch recent workspace activities / audit trail with pagination.
 */
export function useWorkspaceActivitiesQuery(workspaceId, { page = 1, limit = 10 } = {}, options = {}) {
  return useQuery({
    queryKey: memberKeys.activities(workspaceId, page, limit),
    queryFn: () => memberApi.getActivities(workspaceId, { page, limit }),
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
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: memberKeys.invitations(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: ['user-pending-invitations'] }),
      ]);
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
    mutationFn: (memberIdentifier) => memberApi.removeMember(workspaceId, memberIdentifier),
    onMutate: async (memberIdentifier) => {
      await queryClient.cancelQueries({ queryKey: workspaceKeys.members(workspaceId) });
      const previousMembers = queryClient.getQueryData(workspaceKeys.members(workspaceId));

      // Optimistically remove member from query cache immediately
      queryClient.setQueryData(workspaceKeys.members(workspaceId), (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter(
          (m) =>
            m.membership_id !== memberIdentifier &&
            m.id !== memberIdentifier &&
            m.user_id !== memberIdentifier
        );
      });

      return { previousMembers };
    },
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
      await queryClient.refetchQueries({ queryKey: workspaceKeys.members(workspaceId) });
      queryClient.invalidateQueries({ queryKey: memberKeys.activities(workspaceId) });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(workspaceKeys.members(workspaceId), context.previousMembers);
      }
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
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: workspaceKeys.members(workspaceId) });
      const previousMembers = queryClient.getQueryData(workspaceKeys.members(workspaceId));

      // Optimistically update role in query cache immediately
      queryClient.setQueryData(workspaceKeys.members(workspaceId), (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((m) =>
          m.user_id === userId || m.membership_id === userId || m.id === userId
            ? { ...m, role, permission: role }
            : m
        );
      });

      return { previousMembers };
    },
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
      await queryClient.refetchQueries({ queryKey: workspaceKeys.members(workspaceId) });
      queryClient.invalidateQueries({ queryKey: memberKeys.activities(workspaceId) });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(workspaceKeys.members(workspaceId), context.previousMembers);
      }
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
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: memberKeys.invitations(workspaceId) });
      await queryClient.refetchQueries({ queryKey: memberKeys.invitations(workspaceId) });
      queryClient.invalidateQueries({ queryKey: memberKeys.activities(workspaceId) });
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
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: memberKeys.invitations(workspaceId) });
      await queryClient.refetchQueries({ queryKey: memberKeys.invitations(workspaceId) });
      queryClient.invalidateQueries({ queryKey: memberKeys.activities(workspaceId) });
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
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() }),
      ]);
      queryClient.refetchQueries({ queryKey: workspaceKeys.lists() });
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
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) }),
      ]);
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Hook to fetch all pending invitations received by the current user across workspaces.
 */
export function useUserPendingInvitationsQuery(options = {}) {
  return useQuery({
    queryKey: ['user-pending-invitations'],
    queryFn: () => memberApi.getUserPendingInvitations(),
    staleTime: 1000 * 10,
    ...options,
  });
}

/**
 * Mutation hook to accept an invitation.
 */
export function useAcceptUserInvitationMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId) => memberApi.acceptInvitation(invitationId),
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ['user-pending-invitations'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Mutation hook to reject an invitation.
 */
export function useRejectUserInvitationMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId) => memberApi.rejectInvitation(invitationId),
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-pending-invitations'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}
