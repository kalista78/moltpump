import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// Use generic Supabase client - types enforced at application layer
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseClient;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('agents').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export const db = getSupabaseClient();
