/**
 * Create a new Solana wallet for testing
 *
 * Usage:
 *   npx tsx scripts/create-wallet.ts
 */

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const wallet = Keypair.generate();

console.log('🔑 New Solana Wallet Created\n');
console.log('Public Key (address):');
console.log(`  ${wallet.publicKey.toBase58()}\n`);
console.log('Private Key (base58) - ADD TO .env:');
console.log(`  PLATFORM_WALLET_PRIVATE_KEY=${bs58.encode(wallet.secretKey)}\n`);
console.log('⚠️  IMPORTANT:');
console.log('  1. Save the private key securely');
console.log('  2. Fund this wallet with SOL before testing');
console.log(`  3. Send at least 0.05 SOL to: ${wallet.publicKey.toBase58()}`);
