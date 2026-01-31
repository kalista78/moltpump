import type { Metadata } from "next";
import { DM_Sans, DM_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MoltPump | Experimental AI Agent Token Launchpad",
  description: "An experimental AI agent token launchpad on Solana, powered by Pump.fun.",
  keywords: ["Solana", "AI agents", "token launchpad", "Pump.fun", "crypto", "experiment"],
  openGraph: {
    title: "MoltPump | Experimental AI Agent Token Launchpad",
    description: "An experimental Pump.fun launchpad for AI agents.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MoltPump | Experimental AI Agent Token Launchpad",
    description: "An experimental Pump.fun launchpad for AI agents.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  );
}
