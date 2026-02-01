import { Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { PumpSdk } from '@pump-fun/pump-sdk';
import { PUMP_FUN } from '../config/constants.js';
import { PumpFunError, ValidationError } from '../utils/errors.js';
import { isValidPublicKey, getPumpFunUrl, getConnection } from '../utils/solana.js';
import { storageService } from './storage.service.js';
import { feeSharingService } from './fee-sharing.service.js';
import { env } from '../config/env.js';
import bs58 from 'bs58';
import type { TokenLaunchParams, TokenLaunchResult, FeeSharingSetupResult } from '../types/index.js';

interface IpfsUploadResponse {
  metadataUri: string;
}

interface TokenLaunchResultWithFeeSharing extends TokenLaunchResult {
  feeSharingSetup?: FeeSharingSetupResult;
}

class PumpFunService {
  private ipfsUrl = PUMP_FUN.IPFS_UPLOAD_URL;
  private offlineSdk: PumpSdk | null = null;

  private getOfflineSDK(): PumpSdk {
    if (!this.offlineSdk) {
      this.offlineSdk = new PumpSdk();
    }
    return this.offlineSdk;
  }

  private getPlatformWallet(): Keypair {
    try {
      const secretKey = bs58.decode(env.PLATFORM_WALLET_PRIVATE_KEY);
      return Keypair.fromSecretKey(secretKey);
    } catch {
      throw new PumpFunError('Invalid platform wallet private key');
    }
  }

  /**
   * Upload token metadata and image to Pump.fun's IPFS
   */
  async uploadMetadata(params: TokenLaunchParams): Promise<{ metadataUri: string }> {
    try {
      // Fetch image and convert to Blob
      const imageBlob = await storageService.urlToBlob(params.imageUrl);

      // Create form data for IPFS upload
      const formData = new FormData();
      formData.append('file', imageBlob, 'image.png');
      formData.append('name', params.name);
      formData.append('symbol', params.symbol);
      formData.append('description', params.description);
      formData.append('showName', 'true');

      if (params.twitter) {
        formData.append('twitter', params.twitter);
      }
      if (params.telegram) {
        formData.append('telegram', params.telegram);
      }
      if (params.website) {
        formData.append('website', params.website);
      }

      // Upload to Pump.fun IPFS
      const response = await fetch(this.ipfsUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new PumpFunError(`IPFS upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as IpfsUploadResponse;

      if (!result.metadataUri) {
        throw new PumpFunError('IPFS upload returned no metadata URI');
      }

      return { metadataUri: result.metadataUri };
    } catch (error) {
      if (error instanceof PumpFunError) throw error;
      console.error('Metadata upload error:', error);
      throw new PumpFunError('Failed to upload token metadata to IPFS');
    }
  }

  /**
   * Launch a token using Pump.fun's on-chain SDK
   * Platform wallet pays for transaction, creator receives creator fees
   */
  async launchToken(
    params: TokenLaunchParams,
    creatorWalletAddress: string
  ): Promise<TokenLaunchResult> {
    const startTime = Date.now();

    try {
      // Validate creator wallet address
      if (!isValidPublicKey(creatorWalletAddress)) {
        throw new ValidationError('Invalid creator wallet address');
      }

      console.log(`Launching token ${params.symbol} for creator ${creatorWalletAddress}`);

      const sdk = this.getOfflineSDK();
      const connection = getConnection();
      const platformWallet = this.getPlatformWallet();

      // Step 1: Upload metadata to IPFS
      const { metadataUri } = await this.uploadMetadata(params);
      console.log(`Metadata uploaded: ${metadataUri}`);

      // Step 2: Generate a new mint keypair for the token
      const mintKeypair = Keypair.generate();
      console.log(`Generated mint: ${mintKeypair.publicKey.toBase58()}`);

      // Step 3: Build the create instruction using the SDK
      // IMPORTANT: Platform wallet is the creator so we can set up fee sharing
      // The fee sharing will then distribute 40% to agent, 60% to platform
      const createIx = await sdk.createInstruction({
        mint: mintKeypair.publicKey,
        name: params.name,
        symbol: params.symbol,
        uri: metadataUri,
        creator: platformWallet.publicKey, // Platform as creator for fee sharing
        user: platformWallet.publicKey, // Platform wallet pays for tx
      });

      // Step 5: Build and send transaction
      const tx = new Transaction().add(createIx);
      tx.feePayer = platformWallet.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      // Sign with both platform wallet (payer) and mint keypair
      const txSignature = await sendAndConfirmTransaction(
        connection,
        tx,
        [platformWallet, mintKeypair],
        { commitment: 'confirmed' }
      );

      const duration = Date.now() - startTime;
      console.log(`Token launched in ${duration}ms: ${mintKeypair.publicKey.toBase58()}`);
      console.log(`Transaction: ${txSignature}`);

      return {
        success: true,
        mint: mintKeypair.publicKey.toBase58(),
        txSignature,
        pumpfunUrl: getPumpFunUrl(mintKeypair.publicKey.toBase58()),
        metadataUri,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Token launch failed after ${duration}ms:`, error);

      if (error instanceof PumpFunError || error instanceof ValidationError) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during token launch',
      };
    }
  }

  /**
   * Launch a token with fee sharing setup
   * After creating the token, sets up 40/60 fee split (agent/platform)
   */
  async launchTokenWithFeeSharing(
    params: TokenLaunchParams,
    agentWalletAddress: string
  ): Promise<TokenLaunchResultWithFeeSharing> {
    // Step 1: Launch the token
    const launchResult = await this.launchToken(params, agentWalletAddress);

    if (!launchResult.success || !launchResult.mint) {
      return launchResult;
    }

    console.log(`Token created: ${launchResult.mint}, setting up fee sharing...`);

    // Step 2: Set up fee sharing (40% agent, 60% platform)
    // Small delay to ensure the token is fully indexed
    await new Promise(resolve => setTimeout(resolve, 2000));

    const feeSharingResult = await feeSharingService.setupFeeSharing(
      launchResult.mint,
      agentWalletAddress
    );

    if (!feeSharingResult.success) {
      console.warn(`Fee sharing setup failed for ${launchResult.mint}: ${feeSharingResult.error}`);
      // Don't fail the entire launch - token is created, fee sharing can be retried
    } else {
      console.log(`Fee sharing configured for ${launchResult.mint}`);
    }

    return {
      ...launchResult,
      feeSharingSetup: feeSharingResult,
    };
  }

  /**
   * Get token info from Pump.fun API
   */
  async getTokenInfo(mintAddress: string): Promise<{
    bondingCurve?: string;
    marketCap?: number;
    graduated?: boolean;
    priceUsd?: number;
  } | null> {
    try {
      const response = await fetch(`${PUMP_FUN.API_BASE_URL}/coins/${mintAddress}`);

      if (!response.ok) {
        if (response.status === 404) return null;
        return null;
      }

      const data = await response.json() as {
        bonding_curve?: string;
        market_cap?: number;
        complete?: boolean;
        usd_market_cap?: number;
      };

      return {
        bondingCurve: data.bonding_curve,
        marketCap: data.market_cap,
        graduated: data.complete,
        priceUsd: data.usd_market_cap,
      };
    } catch (error) {
      console.error('Get token info error:', error);
      return null;
    }
  }

  /**
   * Calculate creator fee percentage based on market cap
   */
  calculateCreatorFee(marketCapUsd: number): number {
    for (const tier of PUMP_FUN.CREATOR_FEE_TIERS) {
      if (marketCapUsd <= tier.maxMarketCap) {
        return tier.feePercent;
      }
    }
    return 0.05; // Minimum fee
  }
}

export const pumpfunService = new PumpFunService();
