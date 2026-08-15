import { z } from 'zod';
import { workspaceRoleSchema } from './workspaceSchemas';

export const memberResponseSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
  user_name: z.string().nullable().optional(),
  user_email: z.string().nullable().optional(),
  role: workspaceRoleSchema,
  joined_at: z.string(),
});

export const memberListResponseSchema = z.array(memberResponseSchema);

export const inviteMemberRequestSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  role: workspaceRoleSchema.default('EDITOR'),
});

export const updateMemberRoleRequestSchema = z.object({
  role: workspaceRoleSchema,
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
