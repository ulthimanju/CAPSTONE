import apiClient from '@/lib/api';
import {
  memberListResponseSchema,
  memberResponseSchema,
  inviteMemberRequestSchema,
  invitationResponseSchema,
  invitationListResponseSchema,
} from '../schemas/memberSchemas';

export const memberApi = {
  /**
   * List all active members of a workspace.
   */
  getMembers: async (workspaceId) => {
    const response = await apiClient.get(`/api/v1/workspaces/${workspaceId}/members`);
    const parseResult = memberListResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      console.warn('MemberList schema validation warning:', parseResult.error);
      return response.data;
    }
    return parseResult.data;
  },

  /**
   * Invite a collaborator to a workspace by email.
   */
  inviteMember: async (workspaceId, data) => {
    const validated = inviteMemberRequestSchema.parse(data);
    const response = await apiClient.post(`/api/v1/workspaces/${workspaceId}/invite`, validated);
    const parseResult = invitationResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      console.warn('InvitationResponse schema validation warning:', parseResult.error);
      return response.data;
    }
    return parseResult.data;
  },

  /**
   * Remove a member from a workspace.
   */
  removeMember: async (workspaceId, userId) => {
    const response = await apiClient.delete(`/api/v1/workspaces/${workspaceId}/members/${userId}`);
    return response.data;
  },

  /**
   * Update a member's role in a workspace.
   */
  updateMemberRole: async (workspaceId, userId, role) => {
    const response = await apiClient.patch(
      `/api/v1/workspaces/${workspaceId}/members/${userId}/role`,
      { role }
    );
    const parseResult = memberResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      console.warn('MemberResponse role update validation warning:', parseResult.error);
      return response.data;
    }
    return parseResult.data;
  },

  /**
   * List pending invitations for a workspace.
   */
  getInvitations: async (workspaceId) => {
    const response = await apiClient.get(`/api/v1/workspaces/${workspaceId}/invitations`);
    const parseResult = invitationListResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      console.warn('InvitationList schema validation warning:', parseResult.error);
      return response.data;
    }
    return parseResult.data;
  },

  /**
   * Resend an invitation (extends 7 days).
   */
  resendInvitation: async (invitationId) => {
    const response = await apiClient.post(`/api/v1/invitations/${invitationId}/resend`);
    return response.data;
  },

  /**
   * Cancel/revoke an active invitation.
   */
  cancelInvitation: async (invitationId) => {
    const response = await apiClient.delete(`/api/v1/invitations/${invitationId}`);
    return response.data;
  },

  /**
   * Leave a workspace (for non-owners).
   */
  leaveWorkspace: async (workspaceId) => {
    const response = await apiClient.post(`/api/v1/workspaces/${workspaceId}/leave`);
    return response.data;
  },

  /**
   * Transfer workspace ownership to another member.
   */
  transferOwnership: async (workspaceId, newOwnerId) => {
    const response = await apiClient.post(
      `/api/v1/workspaces/${workspaceId}/transfer-ownership`,
      { new_owner_id: newOwnerId }
    );
    return response.data;
  },

  /**
   * List pending invitations received by the current user across all workspaces.
   */
  getUserPendingInvitations: async () => {
    const response = await apiClient.get('/api/v1/invitations/pending');
    return response.data;
  },

  /**
   * Accept an invitation and join the workspace.
   */
  acceptInvitation: async (invitationId) => {
    const response = await apiClient.post(`/api/v1/invitations/${invitationId}/accept`);
    return response.data;
  },

  /**
   * Reject a received invitation.
   */
  rejectInvitation: async (invitationId) => {
    const response = await apiClient.post(`/api/v1/invitations/${invitationId}/reject`);
    return response.data;
  },

  /**
   * List recent workspace activity audit log.
   */
  getActivities: async (workspaceId, limit = 50) => {
    const response = await apiClient.get(
      `/api/v1/workspaces/${workspaceId}/activities?limit=${limit}`
    );
    return response.data;
  },
};

export default memberApi;
