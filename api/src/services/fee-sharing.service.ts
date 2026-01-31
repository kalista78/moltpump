import { Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  PumpSdk,
  OnlinePumpSdk,
  feeSharingConfigPda,
  hasCoinCreatorMigratedToSharingConfig,
  type Shareholder,
  type SharingConfig,
} from '@pump-fun/pump-sdk';
import bs58 from 'bs58';
import { env } from '../config/env.js';
import { FEE_SHARING } from '../config/constants.js';
import { getConnection } from '../utils/solana.js';
import { FeeSharingError } from '../utils/errors.js';
import type { FeeShareholder, FeeSharingSetupResult, FeeDistributionResult } from '../types/index.js';

/**
 * Fee Sharing Service
 *
 * Handles Pump.fun's on-chain fee sharing configuration.
 * Split: 40% to agent (token creator), 60% to MoltPump treasury
 *
 * Flow:
 * 1. After token launch, create fee sharing config
 * 2. Update shareholders with 40/60 split
 * 3. Transfer authority to platform (prevents agent from changing split)
 * 4. Periodically distribute accumulated fees to shareholders
 */
class FeeSharingService {
  private offlineSdk: PumpSdk | null = null;
  private onlineSdk: OnlinePumpSdk | null = null;
  private platformWallet: Keypair | null = null;

  private getOfflineSDK(): PumpSdk {
    if (!this.offlineSdk) {
      this.offlineSdk = new PumpSdk();
    }
    return this.offlineSdk;
  }

  private getOnlineSDK(): OnlinePumpSdk {
    if (!this.onlineSdk) {
      const connection = getConnection();
      this.onlineSdk = new OnlinePumpSdk(connection);
    }
    return this.onlineSdk;
  }

  private getPlatformWallet(): Keypair {
    if (!this.platformWallet) {
      try {
        const secretKey = bs58.decode(env.PLATFORM_WALLET_PRIVATE_KEY);
        this.platformWallet = Keypair.fromSecretKey(secretKey);
      } catch {
        throw new FeeSharingError('Invalid platform wallet private key');
      }
    }
    return this.platformWallet;
  }

  /**
   * Set up fee sharing for a newly launched token
   * Creates config, sets shareholders (40% agent / 60% platform), and locks authority
   */
  async setupFeeSharing(
    mintAddress: string,
    agentWalletAddress: string
  ): Promise<FeeSharingSetupResult> {
    try {
      const sdk = this.getOfflineSDK();
      const platformWallet = this.getPlatformWallet();
      const connection = getConnection();

      const mint = new PublicKey(mintAddress);
      const agentWallet = new PublicKey(agentWalletAddress);
      const treasuryWallet = new PublicKey(env.MOLTPUMP_TREASURY_WALLET);

      console.log(`Setting up fee sharing for mint ${mintAddress}`);
      console.log(`  Agent (40%): ${agentWalletAddress}`);
      console.log(`  Treasury (60%): ${env.MOLTPUMP_TREASURY_WALLET}`);

      // Step 1: Create fee sharing config
      // The platform wallet is the creator/payer and initial authority
      const createConfigIx = await sdk.createFeeSharingConfig({
        creator: platformWallet.publicKey,
        mint,
        pool: null, // null for bonding curve (not yet graduated)
      });

      const createTx = new Transaction().add(createConfigIx);
      createTx.feePayer = platformWallet.publicKey;
      createTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const setupTxSignature = await sendAndConfirmTransaction(
        connection,
        createTx,
        [platformWallet],
        { commitment: 'confirmed' }
      );

      console.log(`Fee sharing config created: ${setupTxSignature}`);

      // Step 2: Update fee shares (40% agent, 60% platform)
      // New shareholders for the 40/60 split
      const newShareholders: Shareholder[] = [
        { address: agentWallet, shareBps: FEE_SHARING.AGENT_SHARE_BPS },
        { address: treasuryWallet, shareBps: FEE_SHARING.PLATFORM_SHARE_BPS },
      ];

      // Current shareholders (initially just the creator from step 1)
      const currentShareholders = [platformWallet.publicKey];

      const updateSharesIx = await sdk.updateFeeShares({
        authority: platformWallet.publicKey,
        mint,
        currentShareholders,
        newShareholders,
      });

      const updateTx = new Transaction().add(updateSharesIx);
      updateTx.feePayer = platformWallet.publicKey;
      updateTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const updateTxSignature = await sendAndConfirmTransaction(
        connection,
        updateTx,
        [platformWallet],
        { commitment: 'confirmed' }
      );

      console.log(`Fee shares updated: ${updateTxSignature}`);

      // Get the config PDA for reference
      const configPda = feeSharingConfigPda(mint);

      return {
        success: true,
        configPda: configPda.toBase58(),
        setupTxSignature,
        updateTxSignature,
      };
    } catch (error) {
      console.error('Fee sharing setup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during fee sharing setup',
      };
    }
  }

  /**
   * Distribute accumulated creator fees to shareholders
   * Should be called periodically (e.g., via cron job)
   */
  async distributeCreatorFees(mintAddress: string): Promise<FeeDistributionResult> {
    try {
      const sdk = this.getOfflineSDK();
      const platformWallet = this.getPlatformWallet();
      const connection = getConnection();

      const mint = new PublicKey(mintAddress);
      const sharingConfigAddress = feeSharingConfigPda(mint);

      // Fetch the sharing config
      const sharingConfigInfo = await connection.getAccountInfo(sharingConfigAddress);
      if (!sharingConfigInfo) {
        return {
          success: false,
          error: 'Fee sharing config not found',
        };
      }

      const sharingConfig = sdk.decodeSharingConfig(sharingConfigInfo);

      // Check if minimum distributable threshold is met
      const minDistributable = await this.getMinimumDistributableFeeInternal(mint, sharingConfig, sharingConfigAddress);
      const currentBalance = await this.getCreatorVaultBalance(mintAddress);

      if (currentBalance < minDistributable) {
        console.log(`Skipping distribution for ${mintAddress}: balance ${currentBalance} < min ${minDistributable}`);
        return {
          success: false,
          error: `Balance ${currentBalance} below minimum distributable ${minDistributable}`,
        };
      }

      // Build distribute instruction
      const distributeIx = await sdk.distributeCreatorFees({
        mint,
        sharingConfig,
        sharingConfigAddress,
      });

      const tx = new Transaction().add(distributeIx);
      tx.feePayer = platformWallet.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const txSignature = await sendAndConfirmTransaction(
        connection,
        tx,
        [platformWallet],
        { commitment: 'confirmed' }
      );

      console.log(`Creator fees distributed for ${mintAddress}: ${txSignature}`);

      return {
        success: true,
        txSignature,
        amountDistributed: currentBalance,
      };
    } catch (error) {
      console.error('Fee distribution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during fee distribution',
      };
    }
  }

  /**
   * Get minimum distributable fee amount (in lamports) - public version
   */
  async getMinimumDistributableFee(mintAddress: string): Promise<number> {
    try {
      const sdk = this.getOfflineSDK();
      const connection = getConnection();
      const mint = new PublicKey(mintAddress);

      const sharingConfigAddress = feeSharingConfigPda(mint);
      const sharingConfigInfo = await connection.getAccountInfo(sharingConfigAddress);

      if (!sharingConfigInfo) {
        return FEE_SHARING.MIN_DISTRIBUTABLE_LAMPORTS;
      }

      const sharingConfig = sdk.decodeSharingConfig(sharingConfigInfo);
      return this.getMinimumDistributableFeeInternal(mint, sharingConfig, sharingConfigAddress);
    } catch (error) {
      console.error('Failed to get minimum distributable fee:', error);
      return FEE_SHARING.MIN_DISTRIBUTABLE_LAMPORTS;
    }
  }

  /**
   * Get minimum distributable fee amount (in lamports) - internal
   */
  private async getMinimumDistributableFeeInternal(
    mint: PublicKey,
    sharingConfig: SharingConfig,
    sharingConfigAddress: PublicKey
  ): Promise<number> {
    try {
      const sdk = this.getOfflineSDK();

      const minFee = await sdk.getMinimumDistributableFee({
        mint,
        sharingConfig,
        sharingConfigAddress,
      });
      return Number(minFee);
    } catch (error) {
      console.error('Failed to get minimum distributable fee:', error);
      // Return default from constants if query fails
      return FEE_SHARING.MIN_DISTRIBUTABLE_LAMPORTS;
    }
  }

  /**
   * Get current balance in creator vault
   */
  async getCreatorVaultBalance(mintAddress: string): Promise<number> {
    try {
      const onlineSdk = this.getOnlineSDK();
      const mint = new PublicKey(mintAddress);

      // Fetch bonding curve to get creator
      const bondingCurve = await onlineSdk.fetchBondingCurve(mint);

      // Get creator vault balance
      const balance = await onlineSdk.getCreatorVaultBalanceBothPrograms(bondingCurve.creator);
      return Number(balance);
    } catch (error) {
      console.error('Failed to get creator vault balance:', error);
      return 0;
    }
  }

  /**
   * Check if fee sharing config exists for a mint
   */
  async hasFeeShareingConfig(mintAddress: string): Promise<boolean> {
    try {
      const onlineSdk = this.getOnlineSDK();
      const mint = new PublicKey(mintAddress);

      // Get bonding curve to check creator
      const bondingCurve = await onlineSdk.fetchBondingCurve(mint);

      return hasCoinCreatorMigratedToSharingConfig({
        mint,
        creator: bondingCurve.creator,
      });
    } catch (error) {
      console.error('Failed to check fee sharing config:', error);
      return false;
    }
  }

  /**
   * Fetch current shareholders for a mint
   */
  async fetchCurrentShareholders(mintAddress: string): Promise<FeeShareholder[]> {
    try {
      const connection = getConnection();
      const sdk = this.getOfflineSDK();
      const mint = new PublicKey(mintAddress);

      const sharingConfigAddress = feeSharingConfigPda(mint);
      const sharingConfigInfo = await connection.getAccountInfo(sharingConfigAddress);

      if (!sharingConfigInfo) {
        return [];
      }

      const sharingConfig = sdk.decodeSharingConfig(sharingConfigInfo);

      return sharingConfig.shareholders.map((s: Shareholder) => ({
        address: s.address.toBase58(),
        shareBps: s.shareBps,
      }));
    } catch (error) {
      console.error('Failed to fetch current shareholders:', error);
      return [];
    }
  }

  /**
   * Get tokens that need fee distribution
   * Returns mints where accumulated fees exceed minimum threshold
   */
  async getTokensReadyForDistribution(mintAddresses: string[]): Promise<string[]> {
    const ready: string[] = [];

    for (const mintAddress of mintAddresses) {
      try {
        const hasConfig = await this.hasFeeShareingConfig(mintAddress);
        if (!hasConfig) continue;

        const balance = await this.getCreatorVaultBalance(mintAddress);

        // Use default minimum if we can't fetch the config
        if (balance >= FEE_SHARING.MIN_DISTRIBUTABLE_LAMPORTS) {
          ready.push(mintAddress);
        }
      } catch (error) {
        console.error(`Error checking ${mintAddress}:`, error);
      }
    }

    return ready;
  }

  /**
   * Batch distribute fees for multiple tokens
   */
  async batchDistributeCreatorFees(mintAddresses: string[]): Promise<Map<string, FeeDistributionResult>> {
    const results = new Map<string, FeeDistributionResult>();

    for (const mintAddress of mintAddresses) {
      const result = await this.distributeCreatorFees(mintAddress);
      results.set(mintAddress, result);

      // Small delay between transactions to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }
}

export const feeSharingService = new FeeSharingService();
