import cron from 'node-cron';
import { tokenQueries } from '../db/queries.js';
import { feeSharingService } from './fee-sharing.service.js';
import { FEE_SHARING, SCHEDULER, SOLANA } from '../config/constants.js';

/**
 * Scheduler Service
 *
 * Handles scheduled background tasks:
 * - Auto-distribution of creator fees when threshold is reached (1 SOL)
 */
class SchedulerService {
  private autoDistributeTask: cron.ScheduledTask | null = null;
  private isRunning = false;

  /**
   * Start all scheduled tasks
   */
  start(): void {
    console.log('🕐 Starting scheduler service...');

    // Auto-distribute fees every 10 minutes
    this.autoDistributeTask = cron.schedule(
      SCHEDULER.AUTO_DISTRIBUTE_CRON,
      () => this.runAutoDistribute()
    );

    console.log(`   ✅ Auto-distribute task scheduled (${SCHEDULER.AUTO_DISTRIBUTE_CRON})`);
    console.log(`   📊 Threshold: ${FEE_SHARING.AUTO_DISTRIBUTE_THRESHOLD_LAMPORTS / SOLANA.LAMPORTS_PER_SOL} SOL`);
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    if (this.autoDistributeTask) {
      this.autoDistributeTask.stop();
      this.autoDistributeTask = null;
    }
    console.log('🕐 Scheduler service stopped');
  }

  /**
   * Run auto-distribution for all tokens that have accumulated >= 1 SOL in fees
   */
  private async runAutoDistribute(): Promise<void> {
    // Prevent concurrent runs
    if (this.isRunning) {
      console.log('[AutoDistribute] Skipping - previous run still in progress');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('\n[AutoDistribute] Starting fee distribution check...');

      // Get all active tokens
      const tokens = await tokenQueries.listAllActive();

      if (tokens.length === 0) {
        console.log('[AutoDistribute] No active tokens found');
        return;
      }

      console.log(`[AutoDistribute] Checking ${tokens.length} active tokens...`);

      let tokensChecked = 0;
      let tokensDistributed = 0;
      let totalDistributed = 0;

      for (const token of tokens) {
        try {
          // Check if fee sharing is configured
          const hasConfig = await feeSharingService.hasFeeShareingConfig(token.mint_address);
          if (!hasConfig) {
            continue;
          }

          tokensChecked++;

          // Get current vault balance
          const balance = await feeSharingService.getCreatorVaultBalance(token.mint_address);

          // Check if balance exceeds auto-distribute threshold (1 SOL)
          if (balance >= FEE_SHARING.AUTO_DISTRIBUTE_THRESHOLD_LAMPORTS) {
            console.log(`[AutoDistribute] ${token.symbol}: ${balance / SOLANA.LAMPORTS_PER_SOL} SOL >= threshold, distributing...`);

            const result = await feeSharingService.distributeCreatorFees(token.mint_address);

            if (result.success) {
              tokensDistributed++;
              totalDistributed += result.amountDistributed || 0;
              console.log(`[AutoDistribute] ${token.symbol}: Distributed ${(result.amountDistributed || 0) / SOLANA.LAMPORTS_PER_SOL} SOL (tx: ${result.txSignature})`);
            } else {
              console.error(`[AutoDistribute] ${token.symbol}: Distribution failed - ${result.error}`);
            }

            // Delay between distributions to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, SCHEDULER.DISTRIBUTION_DELAY_MS));
          }
        } catch (error) {
          console.error(`[AutoDistribute] Error processing ${token.symbol}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[AutoDistribute] Complete: ${tokensChecked} checked, ${tokensDistributed} distributed, ${totalDistributed / SOLANA.LAMPORTS_PER_SOL} SOL total (${duration}ms)`);
    } catch (error) {
      console.error('[AutoDistribute] Error during run:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger auto-distribution (for testing/admin)
   */
  async triggerAutoDistribute(): Promise<{
    tokensChecked: number;
    tokensDistributed: number;
    totalDistributedLamports: number;
    results: Array<{
      mint: string;
      symbol: string;
      success: boolean;
      amountLamports?: number;
      error?: string;
    }>;
  }> {
    const tokens = await tokenQueries.listAllActive();
    const results: Array<{
      mint: string;
      symbol: string;
      success: boolean;
      amountLamports?: number;
      error?: string;
    }> = [];

    let tokensChecked = 0;
    let tokensDistributed = 0;
    let totalDistributed = 0;

    for (const token of tokens) {
      try {
        const hasConfig = await feeSharingService.hasFeeShareingConfig(token.mint_address);
        if (!hasConfig) continue;

        tokensChecked++;
        const balance = await feeSharingService.getCreatorVaultBalance(token.mint_address);

        if (balance >= FEE_SHARING.AUTO_DISTRIBUTE_THRESHOLD_LAMPORTS) {
          const result = await feeSharingService.distributeCreatorFees(token.mint_address);

          if (result.success) {
            tokensDistributed++;
            totalDistributed += result.amountDistributed || 0;
            results.push({
              mint: token.mint_address,
              symbol: token.symbol,
              success: true,
              amountLamports: result.amountDistributed,
            });
          } else {
            results.push({
              mint: token.mint_address,
              symbol: token.symbol,
              success: false,
              error: result.error,
            });
          }

          await new Promise(resolve => setTimeout(resolve, SCHEDULER.DISTRIBUTION_DELAY_MS));
        }
      } catch (error) {
        results.push({
          mint: token.mint_address,
          symbol: token.symbol,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      tokensChecked,
      tokensDistributed,
      totalDistributedLamports: totalDistributed,
      results,
    };
  }
}

export const schedulerService = new SchedulerService();
