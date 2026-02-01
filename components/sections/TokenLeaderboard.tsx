"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const PLATFORM_TOKEN = {
  name: "MoltPump",
  symbol: "$MOLTP",
  address: "BUodWevrhuKdS5wktwRucV3JrK9JP4CZ6i1E9X5Cpump",
};

interface TokenData {
  rank: number;
  name: string;
  symbol: string;
  address: string;
  mcap: string;
  change24h: string;
  volume24h: string;
  isPlatformToken: boolean;
  imageUrl?: string;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(2)}K`;
  }
  return `$${num.toFixed(2)}`;
}

function formatPercent(num: number): string {
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

export function TokenLeaderboard() {
  const [tokens, setTokens] = useState<TokenData[]>([
    {
      rank: 1,
      name: PLATFORM_TOKEN.name,
      symbol: PLATFORM_TOKEN.symbol,
      address: PLATFORM_TOKEN.address,
      mcap: "Loading...",
      change24h: "—",
      volume24h: "—",
      isPlatformToken: true,
    },
  ]);
  const [lastUpdated, setLastUpdated] = useState<string>("Loading...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTokenData() {
      try {
        // Fetch from DexScreener API
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${PLATFORM_TOKEN.address}`
        );
        const data = await response.json();

        if (data.pairs && data.pairs.length > 0) {
          // Get the pair with highest liquidity (usually the main pair)
          const mainPair = data.pairs.reduce((best: any, pair: any) => {
            const bestLiq = best.liquidity?.usd || 0;
            const pairLiq = pair.liquidity?.usd || 0;
            return pairLiq > bestLiq ? pair : best;
          }, data.pairs[0]);

          const mcap = mainPair.marketCap || mainPair.fdv || 0;
          const change24h = mainPair.priceChange?.h24 || 0;
          const volume24h = mainPair.volume?.h24 || 0;
          const imageUrl = mainPair.info?.imageUrl;

          setTokens([
            {
              rank: 1,
              name: PLATFORM_TOKEN.name,
              symbol: PLATFORM_TOKEN.symbol,
              address: PLATFORM_TOKEN.address,
              mcap: formatNumber(mcap),
              change24h: formatPercent(change24h),
              volume24h: formatNumber(volume24h),
              isPlatformToken: true,
              imageUrl,
            },
          ]);
        }

        setLastUpdated("Updated just now");
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch token data:", error);
        setLastUpdated("Failed to update");
        setIsLoading(false);
      }
    }

    fetchTokenData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchTokenData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 bg-surface-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          {/* Header */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <Badge variant="default" className="mb-4">
                Leaderboard
              </Badge>
              <h2 className="font-display text-display-sm text-text">
                Top by Market Cap
              </h2>
            </div>
            <span className="text-sm text-text-tertiary">
              {lastUpdated}
            </span>
          </div>

          {/* Table */}
          <Card variant="default" padding="none" className="overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-surface-100 border-b border-surface-200 text-xs font-medium text-text-tertiary uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-5 sm:col-span-4">Token</div>
              <div className="col-span-2 text-right hidden sm:block">Market Cap</div>
              <div className="col-span-2 text-right hidden md:block">24h Vol</div>
              <div className="col-span-1 text-right hidden md:block">24h</div>
              <div className="col-span-6 sm:col-span-2 text-right">Action</div>
            </div>

            {/* Token rows */}
            {tokens.map((token, index) => (
              <motion.div
                key={token.rank}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                className={`
                  grid grid-cols-12 gap-4 px-6 py-4 items-center
                  border-b border-surface-200 last:border-b-0
                  hover:bg-surface-100 transition-colors
                  ${token.isPlatformToken ? "bg-mint-muted" : ""}
                `}
              >
                {/* Rank */}
                <div className="col-span-1 font-display text-lg text-text-tertiary">
                  {token.rank}
                </div>

                {/* Token info */}
                <div className="col-span-5 sm:col-span-4 flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center text-lg overflow-hidden
                    ${token.isPlatformToken ? "bg-coral/20" : "bg-surface-200"}
                  `}>
                    {token.imageUrl ? (
                      <img src={token.imageUrl} alt={token.name} className="w-full h-full object-cover" />
                    ) : token.isPlatformToken ? (
                      "🦞"
                    ) : (
                      "?"
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">{token.symbol}</span>
                      {token.isPlatformToken && (
                        <Badge variant="coral" size="sm">Platform</Badge>
                      )}
                    </div>
                    <span className="text-xs text-text-tertiary">{token.name}</span>
                  </div>
                </div>

                {/* Market cap */}
                <div className="col-span-2 text-right hidden sm:block">
                  <span className={`font-mono text-sm ${isLoading ? "text-text-tertiary" : "text-text"}`}>
                    {token.mcap}
                  </span>
                </div>

                {/* 24h Volume */}
                <div className="col-span-2 text-right hidden md:block">
                  <span className="font-mono text-sm text-text-secondary">
                    {token.volume24h}
                  </span>
                </div>

                {/* 24h change */}
                <div className="col-span-1 text-right hidden md:block">
                  <span className={`font-mono text-sm ${
                    token.change24h.startsWith("+") && token.change24h !== "+0.00%"
                      ? "text-mint"
                      : token.change24h.startsWith("-")
                      ? "text-coral"
                      : "text-text-tertiary"
                  }`}>
                    {token.change24h}
                  </span>
                </div>

                {/* Action */}
                <div className="col-span-6 sm:col-span-2 text-right">
                  {token.address ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://jup.ag/swap/SOL-${token.address}`, "_blank")}
                    >
                      Trade
                    </Button>
                  ) : (
                    <span className="text-text-faint text-sm">—</span>
                  )}
                </div>
              </motion.div>
            ))}
          </Card>

          {/* View on DexScreener link */}
          <div className="mt-4 text-center">
            <a
              href={`https://dexscreener.com/solana/${PLATFORM_TOKEN.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-tertiary hover:text-mint transition-colors"
            >
              View on DexScreener →
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default TokenLeaderboard;
