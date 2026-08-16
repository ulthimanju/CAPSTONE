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
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  invited_by: z.string().uuid().optional(),
  invited_email: z.string().email(),
  role: workspaceRoleSchema,
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
  created_at: z.string().optional(),
});

export const invitationListResponseSchema = z.array(invitationResponseSchema);
