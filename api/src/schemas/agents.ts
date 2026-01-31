import { z } from 'zod';

export const registerAgentSchema = z.object({
  twitter_handle: z
    .string()
    .min(1, 'Twitter handle is required')
    .max(15, 'Twitter handle must be 15 characters or less')
    .regex(
      /^@?[a-zA-Z0-9_]+$/,
      'Twitter handle can only contain letters, numbers, and underscores'
    )
    .transform(val => val.replace(/^@/, '')), // Remove @ if present
});

export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;

export const updateAgentSchema = z.object({
  twitter_handle: z
    .string()
    .min(1)
    .max(15)
    .regex(/^@?[a-zA-Z0-9_]+$/)
    .transform(val => val.replace(/^@/, ''))
    .optional(),
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
