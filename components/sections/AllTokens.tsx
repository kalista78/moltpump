"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type FilterTab = "new" | "trending" | "mcap";

const filterTabs: { id: FilterTab; label: string }[] = [
  { id: "new", label: "Newest" },
  { id: "trending", label: "Trending" },
  { id: "mcap", label: "Market Cap" },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export function AllTokens() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("new");

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

          {/* Empty state */}
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
        </motion.div>
      </div>
    </section>
  );
}

export default AllTokens;
