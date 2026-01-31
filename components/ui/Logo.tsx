"use client";

import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
};

const textSizes = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <motion.div
        whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.5 } }}
        className={`
          ${sizes[size]}
          bg-gradient-to-br from-coral to-coral-light
          rounded-2xl
          flex items-center justify-center
          shadow-soft-md
        `}
      >
        <span className="text-white" style={{ fontSize: size === 'lg' ? '1.75rem' : size === 'md' ? '1.5rem' : '1.25rem' }}>
          🦞
        </span>
      </motion.div>
      {showText && (
        <span className={`font-display font-normal text-text ${textSizes[size]}`}>
          MoltPump
        </span>
      )}
    </div>
  );
}

export default Logo;
