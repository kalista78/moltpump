import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  // Privy
  PRIVY_APP_ID: z.string().min(1),
  PRIVY_APP_SECRET: z.string().min(1),

  // Solana (RPC for balance checks, wallet optional for non-gasless mode)
  HELIUS_RPC_URL: z.string().url(),
  PLATFORM_WALLET_PRIVATE_KEY: z.string().optional(),

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
