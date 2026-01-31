import { db } from './client.js';
import { NotFoundError } from '../utils/errors.js';
import type { Token, TokenInsert, TokenUpdate, Launch, LaunchInsert, LaunchUpdate } from '../types/index.js';

// Token queries
export const tokenQueries = {
  async findById(id: string): Promise<Token | null> {
    const { data, error } = await db
      .from('tokens')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async findByMintAddress(mintAddress: string): Promise<Token | null> {
    const { data, error } = await db
      .from('tokens')
      .select('*')
      .eq('mint_address', mintAddress)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async create(token: TokenInsert): Promise<Token> {
    const { data, error } = await db
      .from('tokens')
      .insert(token)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: TokenUpdate): Promise<Token> {
    const { data, error } = await db
      .from('tokens')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`Token with id '${id}' not found`);
      }
      throw error;
    }
    return data;
  },

  async list(options: {
    page?: number;
    limit?: number;
    agentId?: string;
    status?: string;
  } = {}): Promise<{ tokens: Token[]; total: number }> {
    const { page = 1, limit = 20, agentId, status } = options;
    const offset = (page - 1) * limit;

    let query = db.from('tokens').select('*', { count: 'exact' });

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('launched_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      tokens: data || [],
      total: count || 0,
    };
  },

  async listByAgent(agentId: string, limit: number = 10): Promise<Token[]> {
    const { data, error } = await db
      .from('tokens')
      .select('*')
      .eq('agent_id', agentId)
      .order('launched_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};

// Launch queries
export const launchQueries = {
  async create(launch: LaunchInsert): Promise<Launch> {
    const { data, error } = await db
      .from('launches')
      .insert(launch)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: LaunchUpdate): Promise<Launch> {
    const { data, error } = await db
      .from('launches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async complete(
    id: string,
    success: boolean,
    tokenId?: string,
    txSignature?: string,
    errorMessage?: string
  ): Promise<Launch> {
    const startedAt = await this.getStartedAt(id);
    const completedAt = new Date();
    const durationMs = startedAt
      ? completedAt.getTime() - new Date(startedAt).getTime()
      : null;

    return this.update(id, {
      success,
      token_id: tokenId || null,
      tx_signature: txSignature || null,
      error_message: errorMessage || null,
      completed_at: completedAt.toISOString(),
      duration_ms: durationMs,
    });
  },

  async getStartedAt(id: string): Promise<string | null> {
    const { data } = await db
      .from('launches')
      .select('started_at')
      .eq('id', id)
      .single();

    return data?.started_at || null;
  },

  async listByAgent(
    agentId: string,
    options: { page?: number; limit?: number; success?: boolean } = {}
  ): Promise<{ launches: Launch[]; total: number }> {
    const { page = 1, limit = 20, success } = options;
    const offset = (page - 1) * limit;

    let query = db
      .from('launches')
      .select('*', { count: 'exact' })
      .eq('agent_id', agentId);

    if (typeof success === 'boolean') {
      query = query.eq('success', success);
    }

    const { data, error, count } = await query
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      launches: data || [],
      total: count || 0,
    };
  },

  async getRecentByAgent(agentId: string, hours: number = 1): Promise<Launch[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await db
      .from('launches')
      .select('*')
      .eq('agent_id', agentId)
      .gte('started_at', since)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
