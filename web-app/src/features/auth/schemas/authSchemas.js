import { z } from 'zod';

/**
 * Runtime schema to validate OAuth callback query parameters.
 */
export const oauthCallbackQuerySchema = z.object({
  token: z.string().min(1, { message: 'Authentication token is required.' }),
  error: z.string().optional(),
});

/**
 * Runtime schema to validate backend UserResponse contracts.
 */
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  picture_url: z.string().nullable().optional(),
  role: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Schema for updating user profile.
 */
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, { message: 'Name must be at least 2 characters.' }).max(100),
  picture_url: z
    .string()
    .trim()
    .url({ message: 'Please enter a valid image URL.' })
    .optional()
    .or(z.literal('')),
});
