import { z } from 'zod';

// Base validation for Twitter handle
const twitterHandleSchema = z
  .string()
  .min(1, 'Twitter handle is required')
  .max(15, 'Twitter handle must be 15 characters or less')
  .regex(
    /^@?[a-zA-Z0-9_]+$/,
    'Twitter handle can only contain letters, numbers, and underscores'
  )
  .transform(val => val.replace(/^@/, '')); // Remove @ if present

// Base validation for Solana wallet address
const walletAddressSchema = z
  .string()
  .min(32, 'Invalid Solana wallet address')
  .max(44, 'Invalid Solana wallet address')
  .regex(
    /^[1-9A-HJ-NP-Za-km-z]+$/,
    'Invalid Solana wallet address format (must be base58)'
  );

// Register schema: either twitter_handle OR wallet_address, not both
export const registerAgentSchema = z
  .object({
    twitter_handle: twitterHandleSchema.optional(),
    wallet_address: walletAddressSchema.optional(),
  })
  .refine(
    data => {
      const hasTwitter = data.twitter_handle !== undefined && data.twitter_handle !== '';
      const hasWallet = data.wallet_address !== undefined && data.wallet_address !== '';
      return hasTwitter || hasWallet;
    },
    { message: 'Either twitter_handle or wallet_address is required' }
  )
  .refine(
    data => {
      const hasTwitter = data.twitter_handle !== undefined && data.twitter_handle !== '';
      const hasWallet = data.wallet_address !== undefined && data.wallet_address !== '';
      return !(hasTwitter && hasWallet);
    },
    { message: 'Provide either twitter_handle or wallet_address, not both' }
  );

export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;

export const updateAgentSchema = z.object({
  twitter_handle: twitterHandleSchema.optional(),
  wallet_address: walletAddressSchema.optional(),
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

export const agentIdParamSchema = z.object({
  id: z.string().uuid('Invalid agent ID format'),
});

export const listAgentsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  active: z
    .enum(['true', 'false'])
    .transform(val => val === 'true')
    .optional(),
});

export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;

// Response schemas for documentation
export const agentResponseSchema = z.object({
  id: z.string().uuid(),
  moltbook_name: z.string(),
  twitter_handle: z.string().nullable(),
  solana_wallet_address: z.string().nullable(),
  total_tokens_launched: z.number(),
  total_fees_earned_lamports: z.number(),
  created_at: z.string().datetime(),
  last_active_at: z.string().datetime(),
  is_active: z.boolean(),
});

export type AgentResponse = z.infer<typeof agentResponseSchema>;
