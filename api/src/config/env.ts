import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  // Privy
  PRIVY_APP_ID: z.string().min(1),
  PRIVY_APP_SECRET: z.string().min(1),

  // Solana RPC and wallet
  SOLANA_RPC_URL: z.string().url(),
  PLATFORM_WALLET_PRIVATE_KEY: z.string().min(1), // Required for fee sharing transactions

  // Fee Sharing - MoltPump treasury receives 60% of creator fees
  MOLTPUMP_TREASURY_WALLET: z.string().min(32).max(44), // Solana base58 address

  // App
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RATE_LIMIT_LAUNCHES_PER_HOUR: z.coerce.number().default(5),

  // Moltbook
  MOLTBOOK_API_URL: z.string().url().default('https://api.moltbook.ai'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
