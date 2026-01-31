/**
 * Test script for launching a token on Pump.fun with fee sharing
 *
 * Usage:
 *   npx tsx scripts/test-launch.ts
 */

import {
  Keypair,
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pumpSdk = require('@pump-fun/pump-sdk');
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import 'dotenv/config';

const sdk = pumpSdk.PUMP_SDK;
const bondingCurvePda = pumpSdk.bondingCurvePda;
const feeSharingConfigPda = pumpSdk.feeSharingConfigPda;

// Test configuration
const TEST_TOKEN = {
  name: 'MoltPump Test 2',
  symbol: 'MPTEST2',
  description: 'Test token with fee sharing - 60% MoltPump / 40% Agent',
  imageUrl: 'https://pump.fun/icon.png',
};

// Fee sharing configuration
const AGENT_WALLET = 'CTKrG1FiX1E9ZW7Qw6ifJ3PSTqWgJ6J6RThHVWXiZQ8Q';
const AGENT_SHARE_BPS = 4000;      // 40%
const PLATFORM_SHARE_BPS = 6000;   // 60%

async function main() {
  console.log('🚀 MoltPump Token Launch Test (with Fee Sharing)\n');

  // Validate env vars
  const rpcUrl = process.env.SOLANA_RPC_URL;
  const platformKeyBase58 = process.env.PLATFORM_WALLET_PRIVATE_KEY;
  const treasuryAddress = process.env.MOLTPUMP_TREASURY_WALLET;

  if (!rpcUrl) {
    console.error('❌ Missing SOLANA_RPC_URL');
    process.exit(1);
  }

  if (!platformKeyBase58 || platformKeyBase58 === 'xxx') {
    console.error('❌ Missing or invalid PLATFORM_WALLET_PRIVATE_KEY');
    process.exit(1);
  }

  if (!treasuryAddress || treasuryAddress === 'xxx') {
    console.error('❌ Missing MOLTPUMP_TREASURY_WALLET');
    process.exit(1);
  }

  // Initialize connection
  console.log('📡 Connecting to Solana...');
  const connection = new Connection(rpcUrl, 'confirmed');

  // Load platform wallet
  let platformWallet: Keypair;
  try {
    const secretKey = bs58.decode(platformKeyBase58);
    platformWallet = Keypair.fromSecretKey(secretKey);
    console.log(`✅ Platform wallet: ${platformWallet.publicKey.toBase58()}`);
  } catch (e) {
    console.error('❌ Invalid PLATFORM_WALLET_PRIVATE_KEY format');
    process.exit(1);
  }

  // Check balance
  const balance = await connection.getBalance(platformWallet.publicKey);
  const balanceSol = balance / LAMPORTS_PER_SOL;
  console.log(`💰 Balance: ${balanceSol.toFixed(4)} SOL`);

  if (balanceSol < 0.05) {
    console.error(`\n❌ Insufficient balance. Need at least 0.05 SOL for token + fee sharing setup.`);
    console.log(`\nSend SOL to: ${platformWallet.publicKey.toBase58()}`);
    process.exit(1);
  }

  // Create a new mint keypair for the token
  const mintKeypair = Keypair.generate();
  console.log(`🪙 New token mint: ${mintKeypair.publicKey.toBase58()}`);

  console.log('\n--- Token Details ---');
  console.log(`Name: ${TEST_TOKEN.name}`);
  console.log(`Symbol: ${TEST_TOKEN.symbol}`);

  console.log('\n--- Fee Sharing Split ---');
  console.log(`Agent (40%):    ${AGENT_WALLET}`);
  console.log(`Treasury (60%): ${treasuryAddress}`);

  // Confirm before proceeding
  console.log('\n⚠️  This will launch a REAL token on Pump.fun mainnet!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 1: Upload metadata to IPFS
  console.log('📤 Step 1: Uploading metadata to IPFS...');

  let metadataUri: string;
  try {
    const imageResponse = await fetch(TEST_TOKEN.imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', imageBlob, 'image.png');
    formData.append('name', TEST_TOKEN.name);
    formData.append('symbol', TEST_TOKEN.symbol);
    formData.append('description', TEST_TOKEN.description);
    formData.append('showName', 'true');

    const ipfsResponse = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: formData,
    });

    if (!ipfsResponse.ok) {
      const errorText = await ipfsResponse.text();
      throw new Error(`IPFS upload failed: ${ipfsResponse.status} - ${errorText}`);
    }

    const ipfsResult = await ipfsResponse.json() as { metadataUri: string };
    metadataUri = ipfsResult.metadataUri;
    console.log(`✅ Metadata URI: ${metadataUri}`);
  } catch (error) {
    console.error('❌ Metadata upload failed:', error);
    process.exit(1);
  }

  // Step 2: Create token on-chain using SDK
  console.log('\n🔧 Step 2: Creating token on Pump.fun...');

  let mintAddress: string;
  try {
    // Build create instruction
    const createIx = await sdk.createInstruction({
      mint: mintKeypair.publicKey,
      name: TEST_TOKEN.name,
      symbol: TEST_TOKEN.symbol,
      uri: metadataUri,
      creator: platformWallet.publicKey, // Creator receives fees initially
      user: platformWallet.publicKey,    // Payer
    });

    // Extend bonding curve account
    const extendIx = await sdk.extendAccountInstruction({
      account: bondingCurvePda(mintKeypair.publicKey),
      user: platformWallet.publicKey,
    });

    // Create associated token account for the creator
    const associatedTokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      platformWallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      platformWallet.publicKey,
      associatedTokenAccount,
      platformWallet.publicKey,
      mintKeypair.publicKey,
      TOKEN_PROGRAM_ID
    );

    // Build transaction
    const tx = new Transaction().add(createIx, extendIx, createAtaIx);
    tx.feePayer = platformWallet.publicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    console.log('📝 Signing and sending transaction...');

    const signature = await sendAndConfirmTransaction(
      connection,
      tx,
      [platformWallet, mintKeypair],
      { commitment: 'confirmed' }
    );

    mintAddress = mintKeypair.publicKey.toBase58();
    console.log(`✅ Token created: ${mintAddress}`);
    console.log(`   TX: ${signature}`);

  } catch (error) {
    console.error('\n❌ Token creation failed:', error);
    process.exit(1);
  }

  // Step 3: Set up fee sharing
  console.log('\n💰 Step 3: Setting up fee sharing (40% agent / 60% platform)...');
  console.log('   Waiting 3 seconds for token to be indexed...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const mint = new PublicKey(mintAddress);
    const agentWallet = new PublicKey(AGENT_WALLET);
    const treasuryWallet = new PublicKey(treasuryAddress);

    // Create fee sharing config
    console.log('   Creating fee sharing config...');
    const createConfigIx = await sdk.createFeeSharingConfig({
      creator: platformWallet.publicKey,
      mint,
      pool: null, // null for bonding curve (not yet graduated)
    });

    const createConfigTx = new Transaction().add(createConfigIx);
    createConfigTx.feePayer = platformWallet.publicKey;
    createConfigTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const configSig = await sendAndConfirmTransaction(
      connection,
      createConfigTx,
      [platformWallet],
      { commitment: 'confirmed' }
    );
    console.log(`   ✅ Config created: ${configSig}`);

    // Update fee shares with 40/60 split
    console.log('   Updating fee shares...');
    const newShareholders = [
      { address: agentWallet, shareBps: AGENT_SHARE_BPS },
      { address: treasuryWallet, shareBps: PLATFORM_SHARE_BPS },
    ];

    const updateSharesIx = await sdk.updateFeeShares({
      authority: platformWallet.publicKey,
      mint,
      currentShareholders: [platformWallet.publicKey],
      newShareholders,
    });

    const updateTx = new Transaction().add(updateSharesIx);
    updateTx.feePayer = platformWallet.publicKey;
    updateTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const updateSig = await sendAndConfirmTransaction(
      connection,
      updateTx,
      [platformWallet],
      { commitment: 'confirmed' }
    );
    console.log(`   ✅ Fee shares updated: ${updateSig}`);

    const configPda = feeSharingConfigPda(mint);
    console.log(`   Config PDA: ${configPda.toBase58()}`);

  } catch (error) {
    console.error('\n❌ Fee sharing setup failed:', error);
    console.log('   Token was created but fee sharing needs manual setup.');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 LAUNCH COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nToken: https://pump.fun/coin/${mintAddress}`);
  console.log(`\nFee Split:`);
  console.log(`  40% → ${AGENT_WALLET}`);
  console.log(`  60% → ${treasuryAddress}`);
}

main().catch(console.error);
