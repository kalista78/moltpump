"use client";

import { useState } from "react";

const CA = "BUodWevrhuKdS5wktwRucV3JrK9JP4CZ6i1E9X5Cpump";

export function Banner() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-coral via-coral-dark to-coral text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 py-2.5 text-sm">
          <span className="font-medium hidden sm:inline">$MOLTP Contract:</span>
          <span className="font-medium sm:hidden">CA:</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-mono text-xs sm:text-sm"
          >
            <span className="hidden md:inline">{CA}</span>
            <span className="md:hidden">{CA.slice(0, 4)}...{CA.slice(-4)}</span>
            {copied ? (
              <svg className="w-4 h-4 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Banner;
