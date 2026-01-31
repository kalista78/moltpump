import { PUMP_FUN } from '../config/constants.js';
import { PumpFunError, ValidationError } from '../utils/errors.js';
import { isValidPublicKey, getPumpFunUrl } from '../utils/solana.js';
import { storageService } from './storage.service.js';
import type { TokenLaunchParams, TokenLaunchResult } from '../types/index.js';

interface IpfsUploadResponse {
  metadataUri: string;
}

interface CreateTokenResponse {
  success: boolean;
  mint?: string;
  txSignature?: string;
  bondingCurve?: string;
  error?: string;
}

class PumpFunService {
  private ipfsUrl = PUMP_FUN.IPFS_UPLOAD_URL;
  private createUrl = PUMP_FUN.CREATE_TOKEN_URL;

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
   * Launch a token using Pump.fun's gasless API
   * Pump.fun covers the transaction fees, creator wallet receives creator fees
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

      // Step 1: Upload metadata to IPFS
      const { metadataUri } = await this.uploadMetadata(params);
      console.log(`Metadata uploaded: ${metadataUri}`);

      // Step 2: Call Pump.fun's gasless create endpoint
      const createPayload = {
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        metadataUri,
        creator: creatorWalletAddress,
        twitter: params.twitter || null,
        telegram: params.telegram || null,
        website: params.website || null,
      };

      const response = await fetch(this.createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Pump.fun create failed: ${response.status} - ${errorText}`);

        // Try to parse error response
        try {
          const errorJson = JSON.parse(errorText);
          throw new PumpFunError(errorJson.error || errorJson.message || `Create failed: ${response.status}`);
        } catch (parseError) {
          throw new PumpFunError(`Token creation failed: ${response.status}`);
        }
      }

      const result = await response.json() as CreateTokenResponse;

      if (!result.success || !result.mint) {
        throw new PumpFunError(result.error || 'Token creation failed - no mint returned');
      }

      const duration = Date.now() - startTime;
      console.log(`Token launched in ${duration}ms: ${result.mint}`);

      return {
        success: true,
        mint: result.mint,
        txSignature: result.txSignature,
        bondingCurveAddress: result.bondingCurve,
        pumpfunUrl: getPumpFunUrl(result.mint),
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
