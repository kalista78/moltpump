import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark foundation - warm undertones
        surface: {
          DEFAULT: "#141416",
          50: "#1a1a1d",
          100: "#1f1f23",
          200: "#27272c",
          300: "#32323a",
          400: "#3f3f47",
        },
        // Primary - Solana green
        mint: {
          DEFAULT: "#14F195",
          light: "#6FFFC6",
          dark: "#0BC77A",
          muted: "rgba(20, 241, 149, 0.12)",
        },
        // Accent - warm coral for personality
        coral: {
          DEFAULT: "#FF6B6B",
          light: "#FF9B9B",
          dark: "#E84545",
          muted: "rgba(255, 107, 107, 0.12)",
        },
        // Text hierarchy - warm whites
        text: {
          DEFAULT: "#FAFAFA",
          secondary: "#A1A1AA",
          tertiary: "#71717A",
          faint: "#52525B",
        },
        // Utility
        success: "#14F195",
        warning: "#FFB547",
        error: "#FF6B6B",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "Menlo", "monospace"],
      },
      fontSize: {
        "display-xl": ["4.5rem", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-lg": ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-md": ["2.5rem", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "display-sm": ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
      },
      boxShadow: {
        "soft-sm": "0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.4)",
        "soft-md": "0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)",
        "soft-lg": "0 8px 32px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3)",
        "soft-xl": "0 16px 48px rgba(0, 0, 0, 0.6), 0 8px 16px rgba(0, 0, 0, 0.4)",
        "inner-soft": "inset 0 2px 4px rgba(0, 0, 0, 0.3)",
        "glow-mint": "0 0 30px rgba(20, 241, 149, 0.2), 0 0 60px rgba(20, 241, 149, 0.1)",
        "glow-coral": "0 0 30px rgba(255, 107, 107, 0.2), 0 0 60px rgba(255, 107, 107, 0.1)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.6s ease-out forwards",
        "slide-in-right": "slideInRight 0.6s ease-out forwards",
        "scale-in": "scaleIn 0.4s ease-out forwards",
        "float": "float 6s ease-in-out infinite",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-mint": "linear-gradient(135deg, #14F195 0%, #6FFFC6 100%)",
        "gradient-dark": "linear-gradient(180deg, #141416 0%, #1a1a1d 100%)",
        "shimmer": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
