import {
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  TransactionExpiredBlockheightExceededError,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { PumpSdk, OnlinePumpSdk, bondingCurvePda } from '@pump-fun/pump-sdk';
import BN from 'bn.js';
import bs58 from 'bs58';
import { env } from '../config/env.js';
import { BUYBACK, FEE_SHARING, SOLANA } from '../config/constants.js';
import { getConnection } from '../utils/solana.js';
import type { BuybackResult } from '../types/index.js';

/**
 * Buyback Service
 *
 * Handles buying tokens with SOL and burning them.
 * Used when agents enable buyback mode for their tokens.
 *
 * Flow:
 * 1. Calculate how much SOL to spend (70% of distributed fees)
 * 2. Buy tokens on the bonding curve
 * 3. Transfer bought tokens to burn address
 */
class BuybackService {
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
        throw new Error('Invalid platform wallet private key');
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

    for (let attempt = 1; attempt <= BUYBACK.MAX_RETRIES; attempt++) {
      try {
        // Get fresh blockhash for each attempt
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        tx.feePayer = signers[0].publicKey;

        console.log(`${description} - attempt ${attempt}/${BUYBACK.MAX_RETRIES}`);

        const signature = await sendAndConfirmTransaction(
          connection,
          tx,
          signers,
          {
            commitment: 'confirmed',
            maxRetries: 3,
          }
        );

        console.log(`${description} succeeded: ${signature}`);
        return signature;
      } catch (error) {
        const isBlockheightError =
          error instanceof TransactionExpiredBlockheightExceededError ||
          (error instanceof Error && error.message.includes('block height exceeded'));

        if (isBlockheightError && attempt < BUYBACK.MAX_RETRIES) {
          console.log(`${description} - blockhash expired, retrying in ${BUYBACK.RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, BUYBACK.RETRY_DELAY_MS));
          continue;
        }

        throw error;
      }
    }

    throw new Error(`${description} failed after ${BUYBACK.MAX_RETRIES} attempts`);
  }

  /**
   * Execute buyback for a token
   * Buys tokens with SOL and burns them
   *
   * @param mintAddress - The token mint address
   * @param solAmountLamports - Amount of SOL to spend (in lamports)
   */
  async executeBuyback(
    mintAddress: string,
    solAmountLamports: number
  ): Promise<BuybackResult> {
    try {
      const sdk = this.getOfflineSDK();
      const onlineSdk = this.getOnlineSDK();
      const connection = getConnection();
      const platformWallet = this.getPlatformWallet();

      const mint = new PublicKey(mintAddress);
      const solAmount = new BN(solAmountLamports);

      console.log(`[Buyback] Starting buyback for ${mintAddress}`);
      console.log(`[Buyback] SOL amount: ${solAmountLamports / SOLANA.LAMPORTS_PER_SOL} SOL`);

      // Step 1: Fetch bonding curve and global config
      const bondingCurve = await onlineSdk.fetchBondingCurve(mint);
      const global = await onlineSdk.fetchGlobal();

      // Check if token has graduated (migrated to AMM)
      if (bondingCurve.complete) {
        console.log(`[Buyback] Token ${mintAddress} has graduated - buyback on AMM not yet supported`);
        return {
          success: false,
          error: 'Token has graduated to AMM - buyback not yet supported for graduated tokens',
        };
      }

      // Get bonding curve account info using the PDA
      const bondingCurveAddress = bondingCurvePda(mint);
      const bondingCurveAccountInfo = await connection.getAccountInfo(bondingCurveAddress);
      if (!bondingCurveAccountInfo) {
        return {
          success: false,
          error: 'Bonding curve account not found',
        };
      }

      // Determine token program
      const mintAccountInfo = await connection.getAccountInfo(mint);
      if (!mintAccountInfo) {
        return {
          success: false,
          error: 'Mint account not found',
        };
      }
      const tokenProgram = mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;

      // Get or create associated token account for platform wallet
      const platformAta = await getAssociatedTokenAddress(
        mint,
        platformWallet.publicKey,
        false,
        tokenProgram
      );

      const platformAtaInfo = await connection.getAccountInfo(platformAta);

      // Step 2: Calculate tokens to buy with slippage
      // The SDK handles the calculation internally when we provide solAmount
      const slippage = BUYBACK.SLIPPAGE_BPS / 10000; // Convert BPS to decimal

      // Calculate expected tokens based on bonding curve
      // Using a simple approximation - the SDK will handle the actual calculation
      const virtualSolReserves = bondingCurve.virtualSolReserves;
      const virtualTokenReserves = bondingCurve.virtualTokenReserves;
      const estimatedTokens = solAmount.mul(virtualTokenReserves).div(virtualSolReserves.add(solAmount));

      console.log(`[Buyback] Estimated tokens to receive: ${estimatedTokens.toString()}`);

      // Step 3: Build buy instructions
      const buyInstructions = await sdk.buyInstructions({
        global,
        bondingCurveAccountInfo,
        bondingCurve,
        associatedUserAccountInfo: platformAtaInfo,
        mint,
        user: platformWallet.publicKey,
        amount: estimatedTokens,
        solAmount,
        slippage,
        tokenProgram,
      });

      // Build and send buy transaction
      const buyTx = new Transaction();

      // Add ATA creation if needed
      if (!platformAtaInfo) {
        buyTx.add(
          createAssociatedTokenAccountInstruction(
            platformWallet.publicKey,
            platformAta,
            platformWallet.publicKey,
            mint,
            tokenProgram
          )
        );
      }

      buyTx.add(...buyInstructions);

      const buyTxSignature = await this.sendWithRetry(
        buyTx,
        [platformWallet],
        `Buy tokens for ${mintAddress}`
      );

      console.log(`[Buyback] Buy transaction: ${buyTxSignature}`);

      // Step 4: Get actual token balance after buy
      // Small delay to ensure the buy is indexed
      await new Promise(resolve => setTimeout(resolve, 1000));

      const tokenBalance = await connection.getTokenAccountBalance(platformAta);
      const actualTokensBought = BigInt(tokenBalance.value.amount);

      console.log(`[Buyback] Tokens bought: ${actualTokensBought.toString()}`);

      if (actualTokensBought === 0n) {
        return {
          success: false,
          buyTxSignature,
          error: 'No tokens received from buy transaction',
        };
      }

      // Step 5: Burn tokens by transferring to burn address
      const burnAddress = new PublicKey(BUYBACK.BURN_ADDRESS);

      // Get or create burn address ATA
      const burnAta = await getAssociatedTokenAddress(
        mint,
        burnAddress,
        true, // allowOwnerOffCurve - burn address is a special address
        tokenProgram
      );

      const burnAtaInfo = await connection.getAccountInfo(burnAta);

      const burnTx = new Transaction();

      // Create burn ATA if needed
      if (!burnAtaInfo) {
        burnTx.add(
          createAssociatedTokenAccountInstruction(
            platformWallet.publicKey,
            burnAta,
            burnAddress,
            mint,
            tokenProgram
          )
        );
      }

      // Transfer tokens to burn address
      burnTx.add(
        createTransferInstruction(
          platformAta,
          burnAta,
          platformWallet.publicKey,
          actualTokensBought,
          [],
          tokenProgram
        )
      );

      const burnTxSignature = await this.sendWithRetry(
        burnTx,
        [platformWallet],
        `Burn tokens for ${mintAddress}`
      );

      console.log(`[Buyback] Burn transaction: ${burnTxSignature}`);
      console.log(`[Buyback] Successfully bought and burned ${actualTokensBought.toString()} tokens`);

      return {
        success: true,
        buyTxSignature,
        burnTxSignature,
        tokensBought: Number(actualTokensBought),
        solSpent: solAmountLamports,
      };
    } catch (error) {
      console.error('[Buyback] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during buyback',
      };
    }
  }

  /**
   * Calculate the agent's share of fees for buyback
   */
  calculateAgentShare(totalFeeLamports: number): number {
    return Math.floor(totalFeeLamports * FEE_SHARING.AGENT_SHARE_BPS / 10000);
  }
}

export const buybackService = new BuybackService();
