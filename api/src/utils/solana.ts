import { PublicKey, Connection } from '@solana/web3.js';
import { env } from '../config/env.js';
import { SolanaError } from './errors.js';
import { SOLANA } from '../config/constants.js';

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(env.HELIUS_RPC_URL, {
      commitment: 'confirmed',
    });
  }
  return connection;
}

export function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function toPublicKey(address: string): PublicKey {
  if (!isValidPublicKey(address)) {
    throw new SolanaError(`Invalid public key: ${address}`);
  }
  return new PublicKey(address);
}

export function lamportsToSol(lamports: number | bigint): number {
  return Number(lamports) / SOLANA.LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * SOLANA.LAMPORTS_PER_SOL);
}

export async function getBalance(address: string): Promise<number> {
  try {
    const conn = getConnection();
    const pubkey = toPublicKey(address);
    const balance = await conn.getBalance(pubkey);
    return lamportsToSol(balance);
  } catch (error) {
    if (error instanceof SolanaError) throw error;
    throw new SolanaError(`Failed to get balance for ${address}`);
  }
}

export async function checkRpcHealth(): Promise<boolean> {
  try {
    const conn = getConnection();
    const slot = await conn.getSlot();
    return slot > 0;
  } catch {
    return false;
  }
}

export function shortenAddress(address: string, chars: number = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getPumpFunUrl(mintAddress: string): string {
  return `https://pump.fun/coin/${mintAddress}`;
}
