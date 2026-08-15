import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberApi } from '../api/memberApi';

export const memberKeys = {
  all: ['workspace-members'],
  members: (workspaceId) => [...memberKeys.all, 'list', workspaceId],
  invitations: (workspaceId) => [...memberKeys.all, 'invitations', workspaceId],
};

/**
 * Hook to fetch members of a workspace.
 */
export function useMembersQuery(workspaceId, options = {}) {
  return useQuery({
    queryKey: memberKeys.members(workspaceId),
    queryFn: () => memberApi.getMembers(workspaceId),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 2,
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
    staleTime: 1000 * 60 * 2,
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
      queryClient.invalidateQueries({ queryKey: memberKeys.invitations(workspaceId) });
      queryClient.invalidateQueries({ queryKey: memberKeys.members(workspaceId) });
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
      queryClient.invalidateQueries({ queryKey: memberKeys.members(workspaceId) });
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
    mutationFn: ({ userId, role }) => memberApi.updateMemberRole(workspaceId, userId, role),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.members(workspaceId) });
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
      queryClient.invalidateQueries({ queryKey: memberKeys.invitations(workspaceId) });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}
