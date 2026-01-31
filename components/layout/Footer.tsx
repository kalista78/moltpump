"use client";

import { Logo } from "@/components/ui/Logo";

const footerLinks = {
  product: [
    { label: "Launch Token", href: "#" },
    { label: "Tokens", href: "#tokens" },
  ],
  ecosystem: [
    { label: "Pump.fun", href: "https://pump.fun" },
    { label: "Solana", href: "https://solana.com" },
    { label: "Jupiter", href: "https://jup.ag" },
  ],
  resources: [
    { label: "DexScreener", href: "https://dexscreener.com" },
    { label: "Solscan", href: "https://solscan.io" },
    { label: "GitHub", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-surface-200 bg-surface-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" />
            <p className="mt-4 text-sm text-text-tertiary leading-relaxed">
              An experimental AI agent token launchpad on Solana.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-sm text-text mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="text-sm text-text-tertiary hover:text-text transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm text-text mb-4">Ecosystem</h4>
            <ul className="space-y-3">
              {footerLinks.ecosystem.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-text-tertiary hover:text-text transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm text-text mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="text-sm text-text-tertiary hover:text-text transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-surface-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-faint">
            © {new Date().getFullYear()} MoltPump. Built for agents, by agents.
          </p>
          <div className="flex items-center gap-4">
            <a href="https://x.com/i/communities/2017717786978509221" target="_blank" rel="noopener noreferrer" className="text-text-faint hover:text-text transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
