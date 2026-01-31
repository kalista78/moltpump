"use client";

import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "mint" | "coral" | "outline";
  size?: "sm" | "md";
}

const variants = {
  default: "bg-surface-200 text-text-secondary",
  mint: "bg-mint-muted text-mint",
  coral: "bg-coral-muted text-coral",
  outline: "bg-transparent border border-surface-300 text-text-tertiary",
};

const sizes = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-3 py-1 text-xs",
};

export function Badge({ variant = "default", size = "md", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-body font-medium
        rounded-full
        whitespace-nowrap
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
