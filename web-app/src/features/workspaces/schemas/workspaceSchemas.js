import { z } from 'zod';

export const workspaceDomainTypeSchema = z.enum(['TECHNICAL', 'NON_TECHNICAL']);
export const workspaceVisibilitySchema = z.enum(['PRIVATE', 'INTERNAL', 'PUBLIC']);
export const workspaceStatusSchema = z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']);
export const workspaceRoleSchema = z.enum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']);

export const createWorkspaceRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Workspace name is required')
    .max(255, 'Workspace name must be less than 255 characters'),
  domain_type: workspaceDomainTypeSchema.default('TECHNICAL'),
  workspace_code_language: z.string().nullable().optional(),
  visibility: workspaceVisibilitySchema.default('PRIVATE'),
});

export const workspaceResponseSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  domain_type: workspaceDomainTypeSchema.default('TECHNICAL'),
  workspace_code_language: z.string().nullable().optional(),
  visibility: workspaceVisibilitySchema.default('PRIVATE'),
  status: workspaceStatusSchema.default('ACTIVE'),
  is_summary_generated: z.boolean().optional().default(false),
  topics_covered: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  archived_at: z.string().nullable().optional(),
  user_role: workspaceRoleSchema.nullable().optional(),
});

export const workspaceListResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  workspaces: z.array(workspaceResponseSchema),
});
