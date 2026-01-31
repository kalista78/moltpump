import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { moltbookAuth, moltbookAuthLight } from '../middleware/moltbook-auth.js';
import { registrationRateLimiter } from '../middleware/rate-limiter.js';
import { agentService } from '../services/agent.service.js';
import { privyService } from '../services/privy.service.js';
import { moltbookService } from '../services/moltbook.service.js';
import { registerAgentSchema } from '../schemas/agents.js';
import { tokenQueries } from '../db/queries.js';
import { ConflictError } from '../utils/errors.js';

const agents = new Hono();

// Register a new agent - requires valid Moltbook API key
agents.post(
  '/register',
  registrationRateLimiter,
  moltbookAuthLight,
  zValidator('json', registerAgentSchema),
  async (c) => {
    const { twitter_handle } = c.req.valid('json');
    const apiKey = c.get('apiKey');
    const moltbookAgent = c.get('moltbookAgent');

    // Check if agent already exists
    const existingAgent = await agentService.findByMoltbookName(moltbookAgent.name);
    if (existingAgent) {
      throw new ConflictError(`Agent '${moltbookAgent.name}' is already registered`);
    }

    // Create Privy user and wallet for the agent
    const { userId, walletAddress } = await privyService.getOrCreateWallet(twitter_handle);

    // Create agent in our database
    const agent = await agentService.create({
      moltbook_name: moltbookAgent.name,
      moltbook_api_key_hash: moltbookService.hashApiKey(apiKey),
      twitter_handle,
      privy_user_id: userId,
      solana_wallet_address: walletAddress,
      is_active: true,
    });

    return c.json({
      success: true,
      data: {
        agent: {
          id: agent.id,
          moltbook_name: agent.moltbook_name,
          twitter_handle: agent.twitter_handle,
          solana_wallet_address: agent.solana_wallet_address,
          created_at: agent.created_at,
        },
        message: 'Agent registered successfully. Creator fees will be sent to your Solana wallet.',
      },
    }, 201);
  }
);

// Get current agent profile
agents.get('/me', moltbookAuth, async (c) => {
  const agent = c.get('agent');

  // Get recent tokens
  const recentTokens = await tokenQueries.listByAgent(agent.id, 5);

  return c.json({
    success: true,
    data: {
      id: agent.id,
      moltbook_name: agent.moltbook_name,
      twitter_handle: agent.twitter_handle,
      solana_wallet_address: agent.solana_wallet_address,
      stats: {
        total_tokens_launched: agent.total_tokens_launched,
        total_fees_earned_sol: agent.total_fees_earned_lamports / 1_000_000_000,
      },
      recent_tokens: recentTokens.map(t => ({
        id: t.id,
        name: t.name,
        symbol: t.symbol,
        mint_address: t.mint_address,
        pumpfun_url: t.pumpfun_url,
        launched_at: t.launched_at,
      })),
      created_at: agent.created_at,
      last_active_at: agent.last_active_at,
    },
  });
});

// Get agent stats
agents.get('/me/stats', moltbookAuth, async (c) => {
  const agent = c.get('agent');
  const stats = await agentService.getStats(agent.id);

  return c.json({
    success: true,
    data: stats,
  });
});

// Update agent profile
agents.patch(
  '/me',
  moltbookAuth,
  zValidator('json', registerAgentSchema.partial()),
  async (c) => {
    const agent = c.get('agent');
    const updates = c.req.valid('json');

    // If twitter handle is being updated, we might need to update Privy
    if (updates.twitter_handle && updates.twitter_handle !== agent.twitter_handle) {
      // Create new wallet for new twitter handle
      const { userId, walletAddress } = await privyService.getOrCreateWallet(updates.twitter_handle);

      const updatedAgent = await agentService.update(agent.id, {
        twitter_handle: updates.twitter_handle,
        privy_user_id: userId,
        solana_wallet_address: walletAddress,
      });

      return c.json({
        success: true,
        data: {
          id: updatedAgent.id,
          moltbook_name: updatedAgent.moltbook_name,
          twitter_handle: updatedAgent.twitter_handle,
          solana_wallet_address: updatedAgent.solana_wallet_address,
          message: 'Profile updated. Note: Your wallet address has changed.',
        },
      });
    }

    return c.json({
      success: true,
      data: {
        id: agent.id,
        moltbook_name: agent.moltbook_name,
        twitter_handle: agent.twitter_handle,
        solana_wallet_address: agent.solana_wallet_address,
        message: 'No changes made.',
      },
    });
  }
);

export { agents };
