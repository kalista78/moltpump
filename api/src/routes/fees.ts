import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { moltbookAuth } from '../middleware/moltbook-auth.js';
import { feeSharingService } from '../services/fee-sharing.service.js';
import { schedulerService } from '../services/scheduler.service.js';
import { tokenQueries } from '../db/queries.js';
import { FEE_SHARING, SOLANA } from '../config/constants.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const fees = new Hono();

// Schema for distribute endpoint
const distributeFeesSchema = z.object({
  mint_address: z.string().min(32).max(44),
});

const batchDistributeSchema = z.object({
  mint_addresses: z.array(z.string().min(32).max(44)).min(1).max(10),
});

/**
 * Get fee sharing status for a token
 */
fees.get(
  '/status/:mint',
  moltbookAuth,
  async (c) => {
    const agent = c.get('agent');
    const mint = c.req.param('mint');

    // Verify token exists and belongs to agent
    const token = await tokenQueries.findByMintAddress(mint);
    if (!token || token.agent_id !== agent.id) {
      throw new NotFoundError(`Token with mint '${mint}' not found`);
    }

    try {
      const hasConfig = await feeSharingService.hasFeeShareingConfig(mint);
      const vaultBalance = await feeSharingService.getCreatorVaultBalance(mint);
      const minDistributable = await feeSharingService.getMinimumDistributableFee(mint);

      return c.json({
        success: true,
        data: {
          mint_address: mint,
          fee_sharing_enabled: hasConfig,
          vault_balance_lamports: vaultBalance,
          min_distributable_lamports: minDistributable,
          can_distribute: hasConfig && vaultBalance >= minDistributable,
          fee_split: {
            agent_percent: FEE_SHARING.AGENT_SHARE_BPS / 100,
            platform_percent: FEE_SHARING.PLATFORM_SHARE_BPS / 100,
          },
        },
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch fee status',
      }, 500);
    }
  }
);

/**
 * Distribute accumulated creator fees for a single token
 */
fees.post(
  '/distribute',
  moltbookAuth,
  zValidator('json', distributeFeesSchema),
  async (c) => {
    const agent = c.get('agent');
    const { mint_address } = c.req.valid('json');

    // Verify token exists and belongs to agent
    const token = await tokenQueries.findByMintAddress(mint_address);
    if (!token || token.agent_id !== agent.id) {
      throw new NotFoundError(`Token with mint '${mint_address}' not found`);
    }

    // Check if fee sharing is configured
    const hasConfig = await feeSharingService.hasFeeShareingConfig(mint_address);
    if (!hasConfig) {
      throw new ValidationError('Fee sharing is not configured for this token');
    }

    // Distribute fees
    const result = await feeSharingService.distributeCreatorFees(mint_address);

    if (!result.success) {
      return c.json({
        success: false,
        error: result.error || 'Fee distribution failed',
      }, 400);
    }

    return c.json({
      success: true,
      data: {
        mint_address,
        tx_signature: result.txSignature,
        amount_distributed_lamports: result.amountDistributed,
        message: 'Fees distributed successfully',
      },
    });
  }
);

/**
 * Batch distribute fees for multiple tokens
 */
fees.post(
  '/distribute/batch',
  moltbookAuth,
  zValidator('json', batchDistributeSchema),
  async (c) => {
    const agent = c.get('agent');
    const { mint_addresses } = c.req.valid('json');

    // Verify all tokens belong to agent
    const validMints: string[] = [];
    for (const mint of mint_addresses) {
      const token = await tokenQueries.findByMintAddress(mint);
      if (token && token.agent_id === agent.id) {
        validMints.push(mint);
      }
    }

    if (validMints.length === 0) {
      throw new ValidationError('No valid tokens found');
    }

    // Get tokens ready for distribution
    const readyMints = await feeSharingService.getTokensReadyForDistribution(validMints);

    if (readyMints.length === 0) {
      return c.json({
        success: true,
        data: {
          message: 'No tokens have fees ready for distribution',
          tokens_checked: validMints.length,
          tokens_distributed: 0,
        },
      });
    }

    // Batch distribute
    const results = await feeSharingService.batchDistributeCreatorFees(readyMints);

    const successful = Array.from(results.entries()).filter(([, r]) => r.success);
    const failed = Array.from(results.entries()).filter(([, r]) => !r.success);

    return c.json({
      success: true,
      data: {
        tokens_checked: validMints.length,
        tokens_distributed: successful.length,
        tokens_failed: failed.length,
        results: Array.from(results.entries()).map(([mint, result]) => ({
          mint_address: mint,
          success: result.success,
          tx_signature: result.txSignature,
          amount_distributed_lamports: result.amountDistributed,
          error: result.error,
        })),
      },
    });
  }
);

/**
 * Get aggregated fee stats for an agent
 */
fees.get(
  '/stats',
  moltbookAuth,
  async (c) => {
    const agent = c.get('agent');

    // Get all tokens for this agent
    const { tokens } = await tokenQueries.list({
      agentId: agent.id,
      limit: 1000,
      page: 1,
    });

    let totalVaultBalance = 0;
    let tokensWithFeeSharing = 0;
    let tokensReadyForDistribution = 0;

    const tokenStats = [];

    for (const token of tokens) {
      try {
        const hasConfig = await feeSharingService.hasFeeShareingConfig(token.mint_address);
        if (!hasConfig) continue;

        tokensWithFeeSharing++;

        const balance = await feeSharingService.getCreatorVaultBalance(token.mint_address);
        const minDistributable = await feeSharingService.getMinimumDistributableFee(token.mint_address);

        totalVaultBalance += balance;

        if (balance >= minDistributable) {
          tokensReadyForDistribution++;
        }

        tokenStats.push({
          mint_address: token.mint_address,
          symbol: token.symbol,
          vault_balance_lamports: balance,
          can_distribute: balance >= minDistributable,
        });
      } catch (error) {
        console.error(`Error fetching stats for ${token.mint_address}:`, error);
      }
    }

    return c.json({
      success: true,
      data: {
        total_tokens: tokens.length,
        tokens_with_fee_sharing: tokensWithFeeSharing,
        tokens_ready_for_distribution: tokensReadyForDistribution,
        total_vault_balance_lamports: totalVaultBalance,
        agent_share_percent: FEE_SHARING.AGENT_SHARE_BPS / 100,
        estimated_agent_earnings_lamports: Math.floor(totalVaultBalance * FEE_SHARING.AGENT_SHARE_BPS / 10000),
        tokens: tokenStats,
      },
    });
  }
);

/**
 * Manually trigger auto-distribution for all tokens above threshold
 * This is an admin endpoint - triggers distribution for ALL tokens platform-wide
 */
fees.post(
  '/auto-distribute',
  moltbookAuth,
  async (c) => {
    console.log('[AutoDistribute] Manual trigger initiated');

    const result = await schedulerService.triggerAutoDistribute();

    return c.json({
      success: true,
      data: {
        tokens_checked: result.tokensChecked,
        tokens_distributed: result.tokensDistributed,
        total_distributed_lamports: result.totalDistributedLamports,
        total_distributed_sol: result.totalDistributedLamports / SOLANA.LAMPORTS_PER_SOL,
        threshold_sol: FEE_SHARING.AUTO_DISTRIBUTE_THRESHOLD_LAMPORTS / SOLANA.LAMPORTS_PER_SOL,
        results: result.results.map(r => ({
          ...r,
          amount_sol: r.amountLamports ? r.amountLamports / SOLANA.LAMPORTS_PER_SOL : undefined,
        })),
      },
    });
  }
);

export { fees };
