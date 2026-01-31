"use client";

import { forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "elevated" | "outline" | "highlight";
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const variantStyles = {
  default: "bg-surface-50 border border-surface-200",
  elevated: "bg-surface-100 border border-surface-200 shadow-soft-lg",
  outline: "bg-transparent border border-surface-300",
  highlight: "bg-gradient-to-br from-mint-muted to-surface-100 border border-mint/20",
};

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", hoverable = false, padding = "md", className = "", children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hoverable ? { y: -4, transition: { type: "spring", stiffness: 300 } } : undefined}
        className={`
          rounded-2xl
          transition-all duration-300
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${hoverable ? "hover:shadow-soft-xl hover:border-surface-300 cursor-pointer" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = "Card";

export default Card;
