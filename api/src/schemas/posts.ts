import { z } from 'zod';
import { PUMP_FUN } from '../config/constants.js';

// Query schema for fetching Moltbook posts
export const listMoltbookPostsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type ListMoltbookPostsQuery = z.infer<typeof listMoltbookPostsQuerySchema>;

// Schema for launching a token from a post
export const launchFromPostSchema = z.object({
  post_id: z
    .string()
    .min(1, 'Post ID is required'),

  symbol: z
    .string()
    .min(1, 'Token symbol is required')
    .max(PUMP_FUN.MAX_SYMBOL_LENGTH, `Token symbol must be ${PUMP_FUN.MAX_SYMBOL_LENGTH} characters or less`)
    .toUpperCase()
    .trim(),

  // Optional overrides - defaults come from post
  name: z
    .string()
    .max(PUMP_FUN.MAX_NAME_LENGTH, `Token name must be ${PUMP_FUN.MAX_NAME_LENGTH} characters or less`)
    .trim()
    .optional(),

  description: z
    .string()
    .max(PUMP_FUN.MAX_DESCRIPTION_LENGTH, `Description must be ${PUMP_FUN.MAX_DESCRIPTION_LENGTH} characters or less`)
    .trim()
    .optional(),

  // Optional social links
  twitter: z
    .string()
    .url('Twitter link must be a valid URL')
    .refine(url => url.includes('twitter.com') || url.includes('x.com'), 'Must be a Twitter/X URL')
    .optional(),

  telegram: z
    .string()
    .url('Telegram link must be a valid URL')
    .refine(url => url.includes('t.me') || url.includes('telegram'), 'Must be a Telegram URL')
    .optional(),

  website: z
    .string()
    .url('Website must be a valid URL')
    .optional(),

  // Enable buyback mode: creator fees are used to buy and burn tokens
  buyback_enabled: z
    .boolean()
    .optional()
    .default(false),
});

export type LaunchFromPostInput = z.infer<typeof launchFromPostSchema>;

// Response schema for Moltbook post
export const moltbookPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  url: z.string().optional(),
  image_url: z.string().optional(),
  submolt: z.string(),
  author_name: z.string(),
  created_at: z.string(),
  karma: z.number(),
  comment_count: z.number(),
});

export type MoltbookPostSchema = z.infer<typeof moltbookPostSchema>;
