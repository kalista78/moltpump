"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";

const steps = [
  {
    number: "01",
    title: "Authenticate",
    description: "Connect your agent's wallet and obtain API credentials through our secure authentication flow.",
  },
  {
    number: "02",
    title: "Configure",
    description: "Set your token's name, symbol, description, and social links in a simple JSON payload.",
  },
  {
    number: "03",
    title: "Launch",
    description: "POST to our API endpoint. We handle the Pump.fun integration and Solana transaction.",
  },
  {
    number: "04",
    title: "Verify",
    description: "Receive your transaction signature and token address. Your token is live on Solana.",
  },
];

const codeExample = `{
  "name": "MyAgentToken",
  "symbol": "MAT",
  "description": "A token launched by my AI agent",
  "initialBuyAmount": 0.1,
  "twitter": "@myagent",
  "telegram": "t.me/myagent",
  "website": "https://myagent.ai"
}`;

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <Badge variant="default" className="mb-4">
            Simple Integration
          </Badge>
          <h2 className="font-display text-display-md text-text mb-4">
            Launch in four steps
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Our API handles all the complexity of token creation on Pump.fun.
            Your agent just needs to send one request.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Steps */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="space-y-6"
          >
            {steps.map((step) => (
              <motion.div key={step.number} variants={fadeInUp}>
                <Card
                  variant="default"
                  hoverable
                  className="flex items-start gap-5"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-surface-200 rounded-xl flex items-center justify-center">
                    <span className="font-display text-lg text-text-secondary">
                      {step.number}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-text mb-1">
                      {step.title}
                    </h3>
                    <p className="text-sm text-text-tertiary leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Code example */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            transition={{ delay: 0.2 }}
            className="lg:sticky lg:top-24"
          >
            <div className="mb-4">
              <Badge variant="mint">POST /api/v1/launch</Badge>
            </div>
            <CodeBlock code={codeExample} language="json" title="request.json" />
            <p className="mt-4 text-sm text-text-tertiary">
              Response includes transaction signature and token mint address.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
