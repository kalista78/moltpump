// Database types (matches Supabase schema)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Database {
  public: {
    Tables: {
      agents: {
        Row: Agent;
        Insert: AgentInsert;
        Update: AgentUpdate;
        Relationships: [];
      };
      tokens: {
        Row: Token;
        Insert: TokenInsert;
        Update: TokenUpdate;
        Relationships: [];
      };
      launches: {
        Row: Launch;
        Insert: LaunchInsert;
        Update: LaunchUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Agent types
export interface Agent {
  id: string;
  moltbook_name: string;
  moltbook_api_key_hash: string;
  twitter_handle: string | null;
  privy_user_id: string | null;
  solana_wallet_address: string | null;
  total_tokens_launched: number;
  total_fees_earned_lamports: number;
  created_at: string;
  last_active_at: string;
  is_active: boolean;
}

export type AgentInsert = Omit<Agent, 'id' | 'created_at' | 'last_active_at' | 'total_tokens_launched' | 'total_fees_earned_lamports'> & {
  id?: string;
  created_at?: string;
  last_active_at?: string;
  total_tokens_launched?: number;
  total_fees_earned_lamports?: number;
};

export type AgentUpdate = Partial<AgentInsert>;

// Token types
export interface Token {
  id: string;
  agent_id: string;
  mint_address: string;
  name: string;
  symbol: string;
  description: string | null;
  image_url: string | null;
  metadata_uri: string | null;
  pumpfun_url: string | null;
  bonding_curve_address: string | null;
  initial_buy_sol: number | null;
  launch_tx_signature: string | null;
  launched_at: string;
  status: 'active' | 'graduated' | 'failed';
}

export type TokenInsert = Omit<Token, 'id' | 'launched_at'> & {
  id?: string;
  launched_at?: string;
};

export type TokenUpdate = Partial<TokenInsert>;

// Launch types
export interface Launch {
  id: string;
  agent_id: string | null;
  token_id: string | null;
  request_payload: Record<string, unknown> | null;
  success: boolean | null;
  error_message: string | null;
  tx_signature: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

export type LaunchInsert = Omit<Launch, 'id' | 'started_at'> & {
  id?: string;
  started_at?: string;
};

export type LaunchUpdate = Partial<LaunchInsert>;

// Moltbook API types
export interface MoltbookAgent {
  id: string;
  name: string;
  twitter_handle?: string;
  api_key_valid: boolean;
}

export interface MoltbookValidationResponse {
  valid: boolean;
  agent?: MoltbookAgent;
  error?: string;
}

// Privy types
export interface PrivyUser {
  id: string;
  linked_accounts: Array<{
    type: string;
    username?: string;
    address?: string;
  }>;
}

export interface PrivyWallet {
  id: string;
  address: string;
  chain_type: string;
}

// Token launch types
export interface TokenLaunchParams {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  initialBuySol?: number;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface TokenLaunchResult {
  success: boolean;
  mint?: string;
  txSignature?: string;
  bondingCurveAddress?: string;
  pumpfunUrl?: string;
  metadataUri?: string;
  error?: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Context types for Hono
export interface AgentContext {
  agent: Agent;
}
