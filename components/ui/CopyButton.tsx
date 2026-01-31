"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CopyButtonProps {
  text: string;
  className?: string;
  displayText?: string;
}

export function CopyButton({ text, className = "", displayText }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const truncatedText = displayText || (text.length > 24
    ? `${text.slice(0, 10)}...${text.slice(-8)}`
    : text);

  return (
    <motion.button
      onClick={handleCopy}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`
        group inline-flex items-center gap-3
        px-4 py-3
        font-mono text-sm
        bg-surface-100 border border-surface-200 rounded-xl
        text-text-secondary
        hover:bg-surface-200 hover:border-surface-300
        transition-all duration-200
        ${className}
      `}
    >
      <span className="truncate">{truncatedText}</span>
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex items-center gap-1 text-mint"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-body">Copied</span>
          </motion.div>
        ) : (
          <motion.svg
            key="copy"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="w-4 h-4 text-text-faint group-hover:text-text-secondary transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default CopyButton;
