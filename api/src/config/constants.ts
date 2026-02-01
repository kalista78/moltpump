export const PUMP_FUN = {
  API_BASE_URL: 'https://frontend-api.pump.fun',
  IPFS_UPLOAD_URL: 'https://pump.fun/api/ipfs',
  CREATE_TOKEN_URL: 'https://pump.fun/api/create',
  BONDING_CURVE_URL: 'https://pump.fun',

  // Fee tiers based on market cap
  CREATOR_FEE_TIERS: [
    { maxMarketCap: 50_000, feePercent: 0.95 },
    { maxMarketCap: 100_000, feePercent: 0.50 },
    { maxMarketCap: 500_000, feePercent: 0.20 },
    { maxMarketCap: Infinity, feePercent: 0.05 },
  ],

  // Token constraints
  MAX_NAME_LENGTH: 32,
  MAX_SYMBOL_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 1000,

  // Initial buy limits
  MIN_INITIAL_BUY_SOL: 0,
  MAX_INITIAL_BUY_SOL: 85,
} as const;

export const SOLANA = {
  LAMPORTS_PER_SOL: 1_000_000_000,
  MAINNET_RPC: 'https://api.mainnet-beta.solana.com',
  DEVNET_RPC: 'https://api.devnet.solana.com',
} as const;

export const API = {
  VERSION: 'v1',
  BASE_PATH: '/api/v1',

  // Domain
  DOMAIN: 'moltpump.xyz',
  API_DOMAIN: 'api.moltpump.xyz',

  // Rate limits
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_LAUNCHES_PER_HOUR: 5,

  // Timeouts
  LAUNCH_TIMEOUT_MS: 60_000,
  RPC_TIMEOUT_MS: 30_000,
} as const;

export const STORAGE = {
  MAX_IMAGE_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  BUCKET_NAME: 'token-images',
} as const;

export const FEE_SHARING = {
  // Fee split in basis points (total must equal 10000)
  AGENT_SHARE_BPS: 7000,      // 70% to token creator (agent)
  PLATFORM_SHARE_BPS: 3000,   // 30% to MoltPump treasury

  // Minimum accumulated fees before distribution (in lamports)
  MIN_DISTRIBUTABLE_LAMPORTS: 10_000_000, // 0.01 SOL

  // Program IDs for fee sharing
  PUMP_PROGRAM_ID: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  PUMP_AMM_PROGRAM_ID: 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
  PUMP_FEES_PROGRAM_ID: 'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ',
} as const;
