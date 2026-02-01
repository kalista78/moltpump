import { z } from 'zod';
import { PUMP_FUN } from '../config/constants.js';

export const launchTokenSchema = z.object({
  name: z
    .string()
    .min(1, 'Token name is required')
    .max(PUMP_FUN.MAX_NAME_LENGTH, `Token name must be ${PUMP_FUN.MAX_NAME_LENGTH} characters or less`)
    .trim(),

  symbol: z
    .string()
    .min(1, 'Token symbol is required')
    .max(PUMP_FUN.MAX_SYMBOL_LENGTH, `Token symbol must be ${PUMP_FUN.MAX_SYMBOL_LENGTH} characters or less`)
    .toUpperCase()
    .trim(),

  description: z
    .string()
    .min(1, 'Token description is required')
    .max(PUMP_FUN.MAX_DESCRIPTION_LENGTH, `Description must be ${PUMP_FUN.MAX_DESCRIPTION_LENGTH} characters or less`)
    .trim(),

  image_url: z
    .string()
    .url('Image URL must be a valid URL')
    .refine(
      url => {
        const lower = url.toLowerCase();
        return lower.endsWith('.png') ||
               lower.endsWith('.jpg') ||
               lower.endsWith('.jpeg') ||
               lower.endsWith('.gif') ||
               lower.endsWith('.webp') ||
               lower.includes('supabase') || // Allow Supabase storage URLs
               lower.includes('ipfs'); // Allow IPFS URLs
      },
      'Image URL must point to a valid image file (PNG, JPG, GIF, or WebP)'
    ),

  // Note: initial_buy_sol not supported with gasless launches
  // Agents can buy after launch using their own wallet

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

  // Auto-announce on Moltbook after launch
  auto_announce: z
    .boolean()
    .optional()
    .default(false),

  // Custom announcement message (uses default template if not provided)
  announcement_template: z
    .string()
    .max(500, 'Announcement template must be 500 characters or less')
    .optional(),
});

export type LaunchTokenInput = z.infer<typeof launchTokenSchema>;

export const tokenIdParamSchema = z.object({
  id: z.string().uuid('Invalid token ID format'),
});

export const mintAddressParamSchema = z.object({
  mint: z
    .string()
    .min(32, 'Invalid mint address')
    .max(50, 'Invalid mint address'),
});

export const listTokensQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['active', 'graduated', 'failed']).optional(),
  agent_id: z.string().uuid().optional(),
});

export type ListTokensQuery = z.infer<typeof listTokensQuerySchema>;

// Response schemas
export const tokenResponseSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  mint_address: z.string(),
  name: z.string(),
  symbol: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  metadata_uri: z.string().nullable(),
  pumpfun_url: z.string().nullable(),
  bonding_curve_address: z.string().nullable(),
  initial_buy_sol: z.number().nullable(),
  launch_tx_signature: z.string().nullable(),
  launched_at: z.string().datetime(),
  status: z.enum(['active', 'graduated', 'failed']),
});

export type TokenResponse = z.infer<typeof tokenResponseSchema>;

export const launchResultSchema = z.object({
  success: z.boolean(),
  token: tokenResponseSchema.optional(),
  tx_signature: z.string().optional(),
  pumpfun_url: z.string().optional(),
  error: z.string().optional(),
});

export type LaunchResult = z.infer<typeof launchResultSchema>;
