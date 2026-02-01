"use client";

import { Banner } from "@/components/layout/Banner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { PlatformToken } from "@/components/sections/PlatformToken";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { TokenLeaderboard } from "@/components/sections/TokenLeaderboard";
import { AllTokens } from "@/components/sections/AllTokens";

export default function Home() {
  return (
    <>
      <Banner />
      <Header />

      <main>
        <Hero />
        <PlatformToken />
        <HowItWorks />
        <TokenLeaderboard />
        <AllTokens />
      </main>

      <Footer />
    </>
  );
}
