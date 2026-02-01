import { Keypair, PublicKey, Transaction, sendAndConfirmTransaction, TransactionExpiredBlockheightExceededError } from '@solana/web3.js';
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

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Fee Sharing Service
 *
 * Handles Pump.fun's on-chain fee sharing configuration.
 * Split: 70% to agent (token creator), 30% to MoltPump treasury
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
   * Send a transaction with retry logic for blockhash expiration
   */
  private async sendWithRetry(
    tx: Transaction,
    signers: Keypair[],
    description: string
  ): Promise<string> {
    const connection = getConnection();

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Get fresh blockhash for each attempt
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        tx.feePayer = signers[0].publicKey;

        console.log(`${description} - attempt ${attempt}/${MAX_RETRIES}`);

        const signature = await sendAndConfirmTransaction(
          connection,
          tx,
          signers,
          {
            commitment: 'confirmed',
            maxRetries: 3, // internal retries for network issues
          }
        );

        console.log(`${description} succeeded: ${signature}`);
        return signature;
      } catch (error) {
        const isBlockheightError =
          error instanceof TransactionExpiredBlockheightExceededError ||
          (error instanceof Error && error.message.includes('block height exceeded'));

        if (isBlockheightError && attempt < MAX_RETRIES) {
          console.log(`${description} - blockhash expired, retrying in ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }

        throw error;
      }
    }

    throw new Error(`${description} failed after ${MAX_RETRIES} attempts`);
  }

  /**
   * Set up fee sharing for a newly launched token
   * Creates config, sets shareholders (70% agent / 30% platform), and locks authority
   */
  async setupFeeSharing(
    mintAddress: string,
    agentWalletAddress: string
  ): Promise<FeeSharingSetupResult> {
    try {
      const sdk = this.getOfflineSDK();
      const platformWallet = this.getPlatformWallet();

      const mint = new PublicKey(mintAddress);
      const agentWallet = new PublicKey(agentWalletAddress);
      const treasuryWallet = new PublicKey(env.MOLTPUMP_TREASURY_WALLET);

      console.log(`Setting up fee sharing for mint ${mintAddress}`);
      console.log(`  Agent (70%): ${agentWalletAddress}`);
      console.log(`  Treasury (30%): ${env.MOLTPUMP_TREASURY_WALLET}`);

      // Step 1: Create fee sharing config
      // The platform wallet is the creator/payer and initial authority
      const createConfigIx = await sdk.createFeeSharingConfig({
        creator: platformWallet.publicKey,
        mint,
        pool: null, // null for bonding curve (not yet graduated)
      });

      const createTx = new Transaction().add(createConfigIx);
      const setupTxSignature = await this.sendWithRetry(
        createTx,
        [platformWallet],
        'Create fee sharing config'
      );

      // Step 2: Update fee shares (70% agent, 30% platform)
      // New shareholders for the 70/30 split
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
      const updateTxSignature = await this.sendWithRetry(
        updateTx,
        [platformWallet],
        'Update fee shares'
      );

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
      const txSignature = await this.sendWithRetry(
        tx,
        [platformWallet],
        `Distribute creator fees for ${mintAddress}`
      );

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
