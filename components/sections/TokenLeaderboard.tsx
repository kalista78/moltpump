"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const PLATFORM_TOKEN = {
  name: "MoltPump",
  symbol: "$MOLTPUMP",
  address: "Mo1tPumpXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
};

const topTokens = [
  {
    rank: 1,
    name: PLATFORM_TOKEN.name,
    symbol: PLATFORM_TOKEN.symbol,
    address: PLATFORM_TOKEN.address,
    mcap: "$0",
    change24h: "+0%",
    isPlatformToken: true,
  },
  { rank: 2, name: "—", symbol: "—", address: "", mcap: "—", change24h: "—", isPlatformToken: false },
  { rank: 3, name: "—", symbol: "—", address: "", mcap: "—", change24h: "—", isPlatformToken: false },
  { rank: 4, name: "—", symbol: "—", address: "", mcap: "—", change24h: "—", isPlatformToken: false },
  { rank: 5, name: "—", symbol: "—", address: "", mcap: "—", change24h: "—", isPlatformToken: false },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export function TokenLeaderboard() {
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
              Updated just now
            </span>
          </div>

          {/* Table */}
          <Card variant="default" padding="none" className="overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-surface-100 border-b border-surface-200 text-xs font-medium text-text-tertiary uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-5 sm:col-span-4">Token</div>
              <div className="col-span-3 sm:col-span-2 text-right hidden sm:block">Market Cap</div>
              <div className="col-span-2 text-right hidden md:block">24h</div>
              <div className="col-span-6 sm:col-span-3 text-right">Action</div>
            </div>

            {/* Token rows */}
            {topTokens.map((token, index) => (
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
                    w-10 h-10 rounded-xl flex items-center justify-center text-lg
                    ${token.isPlatformToken ? "bg-coral/20" : "bg-surface-200"}
                  `}>
                    {token.isPlatformToken ? "🦞" : "?"}
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
                <div className="col-span-3 sm:col-span-2 text-right hidden sm:block">
                  <span className="font-mono text-sm text-text">{token.mcap}</span>
                </div>

                {/* 24h change */}
                <div className="col-span-2 text-right hidden md:block">
                  <span className={`font-mono text-sm ${
                    token.change24h.startsWith("+") && token.change24h !== "+0%"
                      ? "text-mint"
                      : "text-text-tertiary"
                  }`}>
                    {token.change24h}
                  </span>
                </div>

                {/* Action */}
                <div className="col-span-6 sm:col-span-3 text-right">
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
        </motion.div>
      </div>
    </section>
  );
}

export default TokenLeaderboard;
