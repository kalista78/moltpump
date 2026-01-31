import { PrivyClient } from '@privy-io/node';
import { env } from '../config/env.js';
import { PrivyError } from '../utils/errors.js';
import type { PrivyUser, PrivyWallet } from '../types/index.js';

class PrivyService {
  private client: PrivyClient;

  constructor() {
    this.client = new PrivyClient({
      appId: env.PRIVY_APP_ID,
      appSecret: env.PRIVY_APP_SECRET,
    });
  }

  async getUserByTwitterHandle(twitterHandle: string): Promise<PrivyUser | null> {
    try {
      // Remove @ if present
      const cleanHandle = twitterHandle.replace(/^@/, '');

      const user = await this.client.users().getByTwitterUsername({
        username: cleanHandle,
      });

      if (!user) return null;

      return {
        id: user.id,
        linked_accounts: user.linked_accounts.map(account => ({
          type: account.type,
          username: 'username' in account ? (account.username ?? undefined) : undefined,
          address: 'address' in account ? (account.address ?? undefined) : undefined,
        })),
      };
    } catch (error: unknown) {
      // User not found is not an error
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return null;
      }
      console.error('Privy getUserByTwitterHandle error:', error);
      throw new PrivyError('Failed to lookup user by Twitter handle');
    }
  }

  async createUser(twitterHandle: string): Promise<PrivyUser> {
    try {
      const cleanHandle = twitterHandle.replace(/^@/, '');

      // Create user with Twitter linked account
      // The Privy SDK requires specific fields for twitter_oauth
      const user = await this.client.users().create({
        linked_accounts: [{
          type: 'twitter_oauth',
          username: cleanHandle,
          subject: cleanHandle, // Required by Privy
          name: cleanHandle, // Required by Privy
        }],
      });

      return {
        id: user.id,
        linked_accounts: user.linked_accounts.map(account => ({
          type: account.type,
          username: 'username' in account ? (account.username ?? undefined) : undefined,
          address: 'address' in account ? (account.address ?? undefined) : undefined,
        })),
      };
    } catch (error) {
      console.error('Privy createUser error:', error);
      throw new PrivyError('Failed to create Privy user');
    }
  }

  async createSolanaWallet(userId: string): Promise<PrivyWallet> {
    try {
      const wallet = await this.client.wallets().create({
        chain_type: 'solana',
        owner: { user_id: userId },
      });

      return {
        id: wallet.id,
        address: wallet.address,
        chain_type: wallet.chain_type,
      };
    } catch (error) {
      console.error('Privy createSolanaWallet error:', error);
      throw new PrivyError('Failed to create Solana wallet');
    }
  }

  async getOrCreateWallet(twitterHandle: string): Promise<{ userId: string; walletAddress: string }> {
    // First, try to find existing user
    let user = await this.getUserByTwitterHandle(twitterHandle);

    // If no user exists, create one
    if (!user) {
      user = await this.createUser(twitterHandle);
    }

    // Check if user already has a Solana wallet
    const existingSolanaWallet = user.linked_accounts.find(
      account => account.type === 'wallet' && account.address
    );

    if (existingSolanaWallet?.address) {
      return {
        userId: user.id,
        walletAddress: existingSolanaWallet.address,
      };
    }

    // Create new Solana wallet
    const wallet = await this.createSolanaWallet(user.id);

    return {
      userId: user.id,
      walletAddress: wallet.address,
    };
  }

  async getUserWallets(userId: string): Promise<PrivyWallet[]> {
    try {
      // Use internal _get method to fetch user by ID
      const user = await this.client.users()._get(userId);

      if (!user) {
        throw new PrivyError('User not found');
      }

      return user.linked_accounts
        .filter(account => account.type === 'wallet' && 'address' in account)
        .map(account => ({
          id: 'id' in account ? String(account.id) : '',
          address: 'address' in account ? String(account.address) : '',
          chain_type: 'chain_type' in account ? String(account.chain_type) : 'unknown',
        }));
    } catch (error) {
      if (error instanceof PrivyError) throw error;
      console.error('Privy getUserWallets error:', error);
      throw new PrivyError('Failed to get user wallets');
    }
  }
}

export const privyService = new PrivyService();
