import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { moltbookAuth } from '../middleware/moltbook-auth.js';
import { launchRateLimiter } from '../middleware/rate-limiter.js';
import { pumpfunService } from '../services/pumpfun.service.js';
import { tokenQueries, launchQueries } from '../db/queries.js';
import {
  launchTokenSchema,
  listTokensQuerySchema,
  tokenIdParamSchema,
  mintAddressParamSchema,
} from '../schemas/tokens.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const tokens = new Hono();

// PUBLIC: List all tokens (no auth required)
// Used by frontend to display token gallery
tokens.get(
  '/public',
  zValidator('query', listTokensQuerySchema),
  async (c) => {
    const { page, limit, status } = c.req.valid('query');

    const { tokens: tokenList, total } = await tokenQueries.list({
      page,
      limit,
      status: status || 'active', // Default to active tokens
    });

    return c.json({
      success: true,
      data: tokenList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

// Launch a new token
tokens.post(
  '/launch',
  moltbookAuth,
  launchRateLimiter,
  zValidator('json', launchTokenSchema),
  async (c) => {
    const agent = c.get('agent');
    const params = c.req.valid('json');

    // Validate agent has a wallet
    if (!agent.solana_wallet_address) {
      throw new ValidationError('Agent does not have a Solana wallet configured');
    }

    // Create launch audit record
    const launch = await launchQueries.create({
      agent_id: agent.id,
      request_payload: params as Record<string, unknown>,
      success: null,
      error_message: null,
      tx_signature: null,
      token_id: null,
      completed_at: null,
      duration_ms: null,
    });

    try {
      // Launch token on Pump.fun with fee sharing (40% agent / 60% platform)
      const result = await pumpfunService.launchTokenWithFeeSharing(
        {
          name: params.name,
          symbol: params.symbol,
          description: params.description,
          imageUrl: params.image_url,
          twitter: params.twitter,
          telegram: params.telegram,
          website: params.website,
        },
        agent.solana_wallet_address
      );

      if (!result.success || !result.mint) {
        // Update launch record with failure
        await launchQueries.complete(launch.id, false, undefined, undefined, result.error);

        return c.json({
          success: false,
          error: result.error || 'Token launch failed',
        }, 500);
      }

      // Create token record
      const token = await tokenQueries.create({
        agent_id: agent.id,
        mint_address: result.mint,
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        image_url: params.image_url,
        metadata_uri: result.metadataUri || null,
        pumpfun_url: result.pumpfunUrl || null,
        bonding_curve_address: result.bondingCurveAddress || null,
        initial_buy_sol: null, // Gasless launches don't support initial buys
        launch_tx_signature: result.txSignature || null,
        status: 'active',
      });

      // Update launch record with success
      await launchQueries.complete(launch.id, true, token.id, result.txSignature);

      // Build fee sharing info for response
      const feeSharingInfo = result.feeSharingSetup?.success
        ? {
            enabled: true,
            config_pda: result.feeSharingSetup.configPda,
            agent_share: '40%',
            platform_share: '60%',
          }
        : {
            enabled: false,
            error: result.feeSharingSetup?.error,
          };

      return c.json({
        success: true,
        data: {
          token: {
            id: token.id,
            mint_address: token.mint_address,
            name: token.name,
            symbol: token.symbol,
            pumpfun_url: token.pumpfun_url,
            launched_at: token.launched_at,
          },
          tx_signature: result.txSignature,
          fee_sharing: feeSharingInfo,
          message: `Token ${params.symbol} launched successfully! You'll receive 40% of creator fees to ${agent.solana_wallet_address}`,
        },
      }, 201);
    } catch (error) {
      // Update launch record with error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await launchQueries.complete(launch.id, false, undefined, undefined, errorMessage);
      throw error;
    }
  }
);

// List tokens (paginated)
tokens.get(
  '/',
  moltbookAuth,
  zValidator('query', listTokensQuerySchema),
  async (c) => {
    const agent = c.get('agent');
    const { page, limit, status } = c.req.valid('query');

    const { tokens: tokenList, total } = await tokenQueries.list({
      page,
      limit,
      agentId: agent.id,
      status,
    });

    return c.json({
      success: true,
      data: tokenList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

// Get token by ID
tokens.get(
  '/:id',
  moltbookAuth,
  zValidator('param', tokenIdParamSchema),
  async (c) => {
    const agent = c.get('agent');
    const { id } = c.req.valid('param');

    const token = await tokenQueries.findById(id);

    if (!token) {
      throw new NotFoundError(`Token with id '${id}' not found`);
    }

    // Ensure agent owns this token
    if (token.agent_id !== agent.id) {
      throw new NotFoundError(`Token with id '${id}' not found`);
    }

    return c.json({
      success: true,
      data: token,
    });
  }
);

// Get token by mint address
tokens.get(
  '/mint/:mint',
  moltbookAuth,
  zValidator('param', mintAddressParamSchema),
  async (c) => {
    const agent = c.get('agent');
    const { mint } = c.req.valid('param');

    const token = await tokenQueries.findByMintAddress(mint);

    if (!token) {
      throw new NotFoundError(`Token with mint '${mint}' not found`);
    }

    // Ensure agent owns this token
    if (token.agent_id !== agent.id) {
      throw new NotFoundError(`Token with mint '${mint}' not found`);
    }

    // Optionally fetch live data from Pump.fun
    const liveInfo = await pumpfunService.getTokenInfo(mint);

    return c.json({
      success: true,
      data: {
        ...token,
        live: liveInfo,
      },
    });
  }
);

// Get launch history
tokens.get(
  '/launches/history',
  moltbookAuth,
  zValidator('query', listTokensQuerySchema.pick({ page: true, limit: true })),
  async (c) => {
    const agent = c.get('agent');
    const { page, limit } = c.req.valid('query');

    const { launches, total } = await launchQueries.listByAgent(agent.id, { page, limit });

    return c.json({
      success: true,
      data: launches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

export { tokens };
