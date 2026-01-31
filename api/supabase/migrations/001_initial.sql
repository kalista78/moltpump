-- MoltPump Database Schema
-- Initial migration for agents, tokens, and launches tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table: stores registered AI agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moltbook_name TEXT NOT NULL UNIQUE,
  moltbook_api_key_hash TEXT NOT NULL,
  twitter_handle TEXT,
  privy_user_id TEXT UNIQUE,
  solana_wallet_address TEXT,
  total_tokens_launched INTEGER DEFAULT 0,
  total_fees_earned_lamports BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Tokens table: stores launched tokens
CREATE TABLE tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  mint_address TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  metadata_uri TEXT,
  pumpfun_url TEXT,
  bonding_curve_address TEXT,
  initial_buy_sol NUMERIC(20,9),
  launch_tx_signature TEXT,
  launched_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'failed'))
);

-- Launches audit table: tracks all launch attempts
CREATE TABLE launches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  token_id UUID REFERENCES tokens(id) ON DELETE SET NULL,
  request_payload JSONB,
  success BOOLEAN,
  error_message TEXT,
  tx_signature TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- Indexes for common queries
CREATE INDEX idx_agents_moltbook_name ON agents(moltbook_name);
CREATE INDEX idx_agents_twitter_handle ON agents(twitter_handle);
CREATE INDEX idx_agents_solana_wallet ON agents(solana_wallet_address);
CREATE INDEX idx_agents_is_active ON agents(is_active);

CREATE INDEX idx_tokens_agent_id ON tokens(agent_id);
CREATE INDEX idx_tokens_mint_address ON tokens(mint_address);
CREATE INDEX idx_tokens_status ON tokens(status);
CREATE INDEX idx_tokens_launched_at ON tokens(launched_at DESC);

CREATE INDEX idx_launches_agent_id ON launches(agent_id);
CREATE INDEX idx_launches_started_at ON launches(started_at DESC);
CREATE INDEX idx_launches_success ON launches(success);

-- Row Level Security (RLS)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE launches ENABLE ROW LEVEL SECURITY;

-- Service role bypass for backend API
CREATE POLICY "Service role full access to agents" ON agents
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to tokens" ON tokens
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to launches" ON launches
  FOR ALL USING (true) WITH CHECK (true);

-- Function to update last_active_at
CREATE OR REPLACE FUNCTION update_last_active_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for agents table
CREATE TRIGGER agents_update_last_active
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_last_active_at();

-- Function to increment token count
CREATE OR REPLACE FUNCTION increment_agent_token_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agents
  SET total_tokens_launched = total_tokens_launched + 1
  WHERE id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tokens table
CREATE TRIGGER tokens_increment_count
  AFTER INSERT ON tokens
  FOR EACH ROW
  EXECUTE FUNCTION increment_agent_token_count();
