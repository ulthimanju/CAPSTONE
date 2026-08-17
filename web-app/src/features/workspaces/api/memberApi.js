import apiClient from '@/lib/api';
import {
  memberListResponseSchema,
  memberResponseSchema,
  inviteMemberRequestSchema,
  invitationResponseSchema,
  invitationListResponseSchema,
  collaboratorListResponseSchema,
  collaboratorDetailResponseSchema,
} from '../schemas/memberSchemas';

export const memberApi = {
  /**
   * List all active collaborators/members of a workspace with pagination.
   */
  getCollaborators: async (workspaceId, { limit = 30, cursor = null } = {}) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (cursor) params.append('cursor', cursor);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const response = await apiClient.get(`/api/v1/workspaces/${workspaceId}/collaborators${queryString}`);
    const data = response.data;
    
    // Normalize raw response (support array or { items, pagination })
    const rawItems = Array.isArray(data) ? data : (data?.items || []);
    const normalized = rawItems.map((item) => {
      const user = item.user || {
        id: item.user_id,
        name: item.user_name,
        email: item.user_email,
      };
      const membershipId = item.membership_id || item.id;
      const perm = item.permission || item.role;
      return {
        membership_id: membershipId,
        id: membershipId,
        user_id: user?.id || item.user_id,
        user_name: user?.name || item.user_name,
        user_email: user?.email || item.user_email,
        user,
        role: perm,
        permission: perm,
        joined_at: item.joined_at,
        last_accessed_at: item.last_accessed_at,
        version: item.version,
      };
    });

    return normalized;
  },

  /**
   * Backward-compatible alias for getCollaborators.
   */
  getMembers: async (workspaceId, options) => {
    return await memberApi.getCollaborators(workspaceId, options);
  },

  /**
   * Get single collaborator detail by membership ID.
   */
  getCollaboratorDetail: async (workspaceId, membershipId) => {
    const response = await apiClient.get(
      `/api/v1/workspaces/${workspaceId}/collaborators/${membershipId}`
    );
    return response.data;
  },

  /**
   * Invite a collaborator to a workspace by email.
   */
  inviteMember: async (workspaceId, data) => {
    const payload = {
      email: data.email,
      role: data.permission || data.role || 'VIEWER',
      permission: data.permission || data.role || 'VIEWER',
    };
    const response = await apiClient.post(`/api/v1/workspaces/${workspaceId}/collaborators`, payload);
    const parseResult = invitationResponseSchema.safeParse(response.data);
    if (!parseResult.success) {
      console.warn('InvitationResponse schema validation warning:', parseResult.error);
      return response.data;
    }
    return parseResult.data;
  },

  /**
   * Alias for inviteMember.
   */
  inviteCollaborator: async (workspaceId, data) => {
    return await memberApi.inviteMember(workspaceId, data);
  },

  /**
   * Remove a collaborator from a workspace by membership ID or user ID.
   */
  removeMember: async (workspaceId, memberIdentifier) => {
    const response = await apiClient.delete(
      `/api/v1/workspaces/${workspaceId}/collaborators/${memberIdentifier}`
    );
    return response.data;
  },

  /**
   * Alias for removeMember.
   */
  removeCollaborator: async (workspaceId, membershipId) => {
    return await memberApi.removeMember(workspaceId, membershipId);
  },

  /**
   * Update a collaborator's permission level.
   */
  updateCollaboratorPermission: async (workspaceId, membershipId, permission) => {
    const response = await apiClient.patch(
      `/api/v1/workspaces/${workspaceId}/collaborators/${membershipId}`,
      { permission }
    );
    return response.data;
  },

  /**
   * Backward-compatible alias for updateMemberRole.
   */
  updateMemberRole: async (workspaceId, memberIdentifier, role) => {
    return await memberApi.updateCollaboratorPermission(workspaceId, memberIdentifier, role);
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
   * List recent workspace activity audit log with pagination.
   */
  getActivities: async (workspaceId, { page = 1, limit = 10 } = {}) => {
    const response = await apiClient.get(
      `/api/v1/workspaces/${workspaceId}/activities?page=${page}&limit=${limit}`
    );
    return response.data;
  },
};

export default memberApi;
