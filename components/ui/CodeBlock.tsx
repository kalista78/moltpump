"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language = "json", title, showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting for dark theme
  const highlightJson = (str: string) => {
    return str
      .replace(/"([^"]+)":/g, '<span class="text-coral-light">\"$1\"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="text-mint">\"$1\"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="text-text">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="text-text-secondary">$1</span>');
  };

  const lines = code.split('\n');

  return (
    <div className="rounded-2xl overflow-hidden border border-surface-200 bg-surface-50 shadow-soft-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-100 border-b border-surface-200">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-coral/70" />
            <div className="w-3 h-3 rounded-full bg-warning/70" />
            <div className="w-3 h-3 rounded-full bg-mint/70" />
          </div>
          {title && (
            <span className="text-xs font-mono text-text-tertiary">{title}</span>
          )}
        </div>
        <motion.button
          onClick={handleCopy}
          whileTap={{ scale: 0.95 }}
          className="text-xs font-medium text-text-tertiary hover:text-text transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </motion.button>
      </div>

      {/* Code content */}
      <div className="p-4 overflow-x-auto">
        <pre className="font-mono text-sm leading-relaxed text-text-secondary">
          {showLineNumbers ? (
            <code>
              {lines.map((line, i) => (
                <div key={i} className="flex">
                  <span className="select-none text-text-faint w-8 text-right mr-4">
                    {i + 1}
                  </span>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: language === "json" ? highlightJson(line) : line,
                    }}
                  />
                </div>
              ))}
            </code>
          ) : (
            <code
              dangerouslySetInnerHTML={{
                __html: language === "json" ? highlightJson(code) : code,
              }}
            />
          )}
        </pre>
      </div>
    </div>
  );
}

export default CodeBlock;
