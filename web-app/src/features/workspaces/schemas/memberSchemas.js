import { z } from 'zod';
import { workspaceRoleSchema } from './workspaceSchemas';

export const collaboratorUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export const collaboratorItemSchema = z.object({
  membership_id: z.string().uuid(),
  user: collaboratorUserSchema,
  permission: workspaceRoleSchema,
  joined_at: z.string(),
});

export const paginationMetaSchema = z.object({
  next_cursor: z.string().nullable().optional(),
  has_more: z.boolean().default(false),
});

export const collaboratorListResponseSchema = z.object({
  items: z.array(collaboratorItemSchema),
  pagination: paginationMetaSchema.optional(),
});

export const collaboratorDetailResponseSchema = z.object({
  membership_id: z.string().uuid(),
  user: collaboratorUserSchema,
  permission: workspaceRoleSchema,
  joined_at: z.string(),
  last_accessed_at: z.string().nullable().optional(),
});

export const updateCollaboratorPermissionRequestSchema = z.object({
  permission: workspaceRoleSchema,
});

// Legacy schema compatibility
export const memberResponseSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  user_name: z.string().nullable().optional(),
  user_email: z.string().nullable().optional(),
  role: workspaceRoleSchema,
  joined_at: z.string(),
});

export const memberListResponseSchema = z.union([
  collaboratorListResponseSchema,
  z.array(memberResponseSchema),
]);

export const inviteMemberRequestSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  role: workspaceRoleSchema.optional(),
  permission: workspaceRoleSchema.optional(),
});

export const updateMemberRoleRequestSchema = z.object({
  role: workspaceRoleSchema.optional(),
  permission: workspaceRoleSchema.optional(),
});

export const invitationResponseSchema = z.object({
  id: z.string(),
  workspace_id: z.string(),
  invited_by: z.string().optional().nullable(),
  invited_user_id: z.string().optional().nullable(),
  invited_email: z.string().nullable().optional(),
  role: z.any(),
  status: z.any(),
  expires_at: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  accepted_at: z.string().optional().nullable(),
});

export const invitationListResponseSchema = z.array(invitationResponseSchema);
