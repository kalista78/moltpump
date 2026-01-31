import { db } from '../db/client.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type { Agent, AgentInsert, AgentUpdate } from '../types/index.js';

class AgentService {
  async findById(id: string): Promise<Agent | null> {
    const { data, error } = await db
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  async findByMoltbookName(name: string): Promise<Agent | null> {
    const { data, error } = await db
      .from('agents')
      .select('*')
      .eq('moltbook_name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  async findByApiKeyHash(hash: string): Promise<Agent | null> {
    const { data, error } = await db
      .from('agents')
      .select('*')
      .eq('moltbook_api_key_hash', hash)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  async findByWalletAddress(address: string): Promise<Agent | null> {
    const { data, error } = await db
      .from('agents')
      .select('*')
      .eq('solana_wallet_address', address)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  async create(agent: AgentInsert): Promise<Agent> {
    // Check for existing agent with same name
    const existing = await this.findByMoltbookName(agent.moltbook_name);
    if (existing) {
      throw new ConflictError(`Agent with name '${agent.moltbook_name}' already exists`);
    }

    const { data, error } = await db
      .from('agents')
      .insert(agent)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: AgentUpdate): Promise<Agent> {
    const { data, error } = await db
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`Agent with id '${id}' not found`);
      }
      throw error;
    }

    return data;
  }

  async updateLastActive(id: string): Promise<void> {
    await db
      .from('agents')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', id);
  }

  async incrementFeesEarned(id: string, lamports: number): Promise<void> {
    const agent = await this.findById(id);
    if (!agent) {
      throw new NotFoundError(`Agent with id '${id}' not found`);
    }

    await db
      .from('agents')
      .update({
        total_fees_earned_lamports: agent.total_fees_earned_lamports + lamports,
      })
      .eq('id', id);
  }

  async deactivate(id: string): Promise<void> {
    await this.update(id, { is_active: false });
  }

  async list(options: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  } = {}): Promise<{ agents: Agent[]; total: number }> {
    const { page = 1, limit = 20, isActive } = options;
    const offset = (page - 1) * limit;

    let query = db.from('agents').select('*', { count: 'exact' });

    if (typeof isActive === 'boolean') {
      query = query.eq('is_active', isActive);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      agents: data || [],
      total: count || 0,
    };
  }

  async getStats(id: string): Promise<{
    totalTokens: number;
    totalFeesEarnedSol: number;
    lastActive: string;
  }> {
    const agent = await this.findById(id);
    if (!agent) {
      throw new NotFoundError(`Agent with id '${id}' not found`);
    }

    return {
      totalTokens: agent.total_tokens_launched,
      totalFeesEarnedSol: agent.total_fees_earned_lamports / 1_000_000_000,
      lastActive: agent.last_active_at,
    };
  }
}

export const agentService = new AgentService();
