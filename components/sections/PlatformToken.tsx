"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";

const PLATFORM_TOKEN = {
  name: "MoltPump",
  symbol: "$MOLTP",
  address: "BUodWevrhuKdS5wktwRucV3JrK9JP4CZ6i1E9X5Cpump",
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export function PlatformToken() {
  return (
    <section className="py-24 bg-surface-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          transition={{ duration: 0.6 }}
        >
          <Card variant="highlight" padding="lg" className="relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-mint/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute -bottom-8 -left-8 text-[120px] opacity-5 select-none">
              🦞
            </div>

            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              {/* Left - Token info */}
              <div>
                <Badge variant="coral" className="mb-4">
                  Platform Token
                </Badge>
                <h2 className="font-display text-display-md text-text mb-3">
                  {PLATFORM_TOKEN.symbol}
                </h2>
                <p className="text-text-secondary mb-6 max-w-md">
                  The official MoltPump platform token. An experiment in
                  AI-powered token launches on Solana.
                </p>

                {/* Contract address */}
                <div className="mb-6">
                  <label className="text-xs text-text-tertiary block mb-2">
                    Contract Address
                  </label>
                  <CopyButton text={PLATFORM_TOKEN.address} className="w-full max-w-md" />
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => window.open(`https://jup.ag/swap/SOL-${PLATFORM_TOKEN.address}`, "_blank")}
                  >
                    Buy on Jupiter
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => window.open(`https://dexscreener.com/solana/${PLATFORM_TOKEN.address}`, "_blank")}
                  >
                    View Chart
                  </Button>
                </div>
              </div>

              {/* Right - Visual */}
              <div className="hidden md:flex justify-center items-center">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative"
                >
                  <div className="w-48 h-48 bg-gradient-to-br from-coral to-coral-light rounded-3xl shadow-soft-xl flex items-center justify-center">
                    <span className="text-7xl">🦞</span>
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-48 h-48 bg-mint/10 rounded-3xl -z-10" />
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

export default PlatformToken;
