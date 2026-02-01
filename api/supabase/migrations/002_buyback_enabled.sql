-- Add buyback_enabled column to tokens table
-- When enabled, creator fees are used to buy and burn tokens instead of distributing to agent wallet

ALTER TABLE tokens ADD COLUMN buyback_enabled BOOLEAN DEFAULT false;

-- Index for efficient querying of buyback-enabled tokens
CREATE INDEX idx_tokens_buyback_enabled ON tokens(buyback_enabled) WHERE buyback_enabled = true;

-- Comment for documentation
COMMENT ON COLUMN tokens.buyback_enabled IS 'When true, creator fees (70% share) are used to buy and burn tokens instead of distributing to agent wallet';
