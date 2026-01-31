"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { ready, authenticated, login, logout, user } = usePrivy();

  // Get the user's wallet address (embedded or external)
  const walletAddress = user?.wallet?.address ||
    user?.linkedAccounts?.find(account => account.type === 'wallet')?.address;

  const shortenAddress = (address: string) =>
    `${address.slice(0, 4)}...${address.slice(-4)}`;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300
        ${scrolled
          ? "bg-surface/80 backdrop-blur-xl border-b border-surface-200"
          : "bg-transparent"
        }
      `}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" />
            <Badge variant="outline" size="sm" className="hidden sm:inline-flex">
              Beta
            </Badge>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#how-it-works"
              className="text-sm text-text-secondary hover:text-text transition-colors"
            >
              How it works
            </Link>
            <Link
              href="#tokens"
              className="text-sm text-text-secondary hover:text-text transition-colors"
            >
              Tokens
            </Link>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            {ready && authenticated ? (
              <>
                {walletAddress && (
                  <span className="hidden sm:inline-flex text-sm text-text-secondary font-mono">
                    {shortenAddress(walletAddress)}
                  </span>
                )}
                <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:inline-flex">
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={login}
                disabled={!ready}
                className="hidden sm:inline-flex"
              >
                Connect
              </Button>
            )}
            <Button variant="secondary" size="sm">
              Launch Token
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

export default Header;
