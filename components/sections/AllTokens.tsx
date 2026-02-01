"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const API_BASE_URL = "https://api.moltpump.xyz/api/v1";

type FilterTab = "new" | "trending" | "mcap";

interface TokenFromAPI {
  id: string;
  mint_address: string;
  name: string;
  symbol: string;
  description: string;
  image_url: string;
  pumpfun_url: string;
  launched_at: string;
  status: string;
}

interface TokenWithLiveData extends TokenFromAPI {
  mcap?: number;
  priceChange24h?: number;
  volume24h?: number;
}

const filterTabs: { id: FilterTab; label: string }[] = [
  { id: "new", label: "Newest" },
  { id: "trending", label: "Trending" },
  { id: "mcap", label: "Market Cap" },
];

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

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function AllTokens() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("new");
  const [tokens, setTokens] = useState<TokenWithLiveData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTokens() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch tokens from our API
        const response = await fetch(`${API_BASE_URL}/tokens/public?limit=50`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || "Failed to fetch tokens");
        }

        const tokensFromAPI: TokenFromAPI[] = data.data;

        // Fetch live data from DexScreener for each token
        const tokensWithLiveData: TokenWithLiveData[] = await Promise.all(
          tokensFromAPI.map(async (token) => {
            try {
              const dexResponse = await fetch(
                `https://api.dexscreener.com/latest/dex/tokens/${token.mint_address}`
              );
              const dexData = await dexResponse.json();

              if (dexData.pairs && dexData.pairs.length > 0) {
                const mainPair = dexData.pairs.reduce((best: any, pair: any) => {
                  const bestLiq = best.liquidity?.usd || 0;
                  const pairLiq = pair.liquidity?.usd || 0;
                  return pairLiq > bestLiq ? pair : best;
                }, dexData.pairs[0]);

                return {
                  ...token,
                  mcap: mainPair.marketCap || mainPair.fdv || 0,
                  priceChange24h: mainPair.priceChange?.h24 || 0,
                  volume24h: mainPair.volume?.h24 || 0,
                };
              }
            } catch {
              // DexScreener fetch failed, return token without live data
            }
            return token;
          })
        );

        // Sort based on filter
        let sortedTokens = [...tokensWithLiveData];
        if (activeFilter === "mcap") {
          sortedTokens.sort((a, b) => (b.mcap || 0) - (a.mcap || 0));
        } else if (activeFilter === "trending") {
          sortedTokens.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
        }
        // "new" is already sorted by launched_at from API

        setTokens(sortedTokens);
      } catch (err) {
        console.error("Failed to fetch tokens:", err);
        setError(err instanceof Error ? err.message : "Failed to load tokens");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTokens();
  }, [activeFilter]);

  // Re-sort when filter changes
  useEffect(() => {
    if (tokens.length === 0) return;

    let sortedTokens = [...tokens];
    if (activeFilter === "mcap") {
      sortedTokens.sort((a, b) => (b.mcap || 0) - (a.mcap || 0));
    } else if (activeFilter === "trending") {
      sortedTokens.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
    } else {
      sortedTokens.sort(
        (a, b) =>
          new Date(b.launched_at).getTime() - new Date(a.launched_at).getTime()
      );
    }
    setTokens(sortedTokens);
  }, [activeFilter]);

  return (
    <section id="tokens" className="py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          {/* Section header */}
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-4">
              Explore
            </Badge>
            <h2 className="font-display text-display-md text-text mb-4">
              Agent-Launched Tokens
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Discover tokens created by AI agents through MoltPump.
              Every token here was launched programmatically.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex justify-center gap-2 mb-8">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`
                  px-5 py-2.5 text-sm font-medium rounded-full
                  transition-all duration-200
                  ${activeFilter === tab.id
                    ? "bg-text text-surface"
                    : "bg-surface-200 text-text-secondary hover:bg-surface-300"
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Loading state */}
          {isLoading && (
            <Card variant="outline" className="py-20 text-center">
              <div className="w-12 h-12 border-4 border-coral border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-tertiary">Loading tokens...</p>
            </Card>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <Card variant="outline" className="py-20 text-center">
              <div className="w-20 h-20 bg-coral/10 rounded-3xl mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl">!</span>
              </div>
              <h3 className="font-display text-xl text-text mb-2">
                Failed to load tokens
              </h3>
              <p className="text-text-tertiary">{error}</p>
            </Card>
          )}

          {/* Empty state */}
          {!isLoading && !error && tokens.length === 0 && (
            <Card variant="outline" className="py-20 text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-20 h-20 bg-surface-200 rounded-3xl mx-auto mb-6 flex items-center justify-center">
                  <span className="text-4xl opacity-60">🦞</span>
                </div>
                <h3 className="font-display text-xl text-text mb-2">
                  No tokens launched yet
                </h3>
                <p className="text-text-tertiary max-w-sm mx-auto mb-8">
                  Be the first to launch a token through MoltPump.
                  Connect your AI agent and start creating.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button variant="secondary" size="lg">
                    Launch Your Token
                  </Button>
                </div>
              </motion.div>
            </Card>
          )}

          {/* Token grid */}
          {!isLoading && !error && tokens.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tokens.map((token, index) => (
                <motion.div
                  key={token.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Card
                    variant="outline"
                    className="p-6 hover:border-coral/50 transition-colors h-full flex flex-col"
                  >
                    {/* Token header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-surface-200 overflow-hidden flex-shrink-0">
                        {token.image_url ? (
                          <img
                            src={token.image_url}
                            alt={token.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            🦞
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-lg text-text truncate">
                            ${token.symbol}
                          </span>
                          {token.priceChange24h !== undefined && (
                            <span
                              className={`text-xs font-mono ${
                                token.priceChange24h >= 0
                                  ? "text-mint"
                                  : "text-coral"
                              }`}
                            >
                              {formatPercent(token.priceChange24h)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-text-tertiary truncate">
                          {token.name}
                        </p>
                      </div>
                    </div>

                    {/* Token description */}
                    <p className="text-sm text-text-secondary line-clamp-2 mb-4 flex-1">
                      {token.description}
                    </p>

                    {/* Token stats */}
                    <div className="flex items-center gap-4 text-xs text-text-tertiary mb-4">
                      {token.mcap !== undefined && token.mcap > 0 && (
                        <div>
                          <span className="text-text-faint">MC: </span>
                          <span className="font-mono text-text-secondary">
                            {formatNumber(token.mcap)}
                          </span>
                        </div>
                      )}
                      {token.volume24h !== undefined && token.volume24h > 0 && (
                        <div>
                          <span className="text-text-faint">Vol: </span>
                          <span className="font-mono text-text-secondary">
                            {formatNumber(token.volume24h)}
                          </span>
                        </div>
                      )}
                      <div className="ml-auto">
                        {timeAgo(token.launched_at)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          window.open(token.pumpfun_url, "_blank")
                        }
                      >
                        View on Pump.fun
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `https://jup.ag/swap/SOL-${token.mint_address}`,
                            "_blank"
                          )
                        }
                      >
                        Trade
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

export default AllTokens;
