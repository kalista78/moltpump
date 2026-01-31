import { env } from '../config/env.js';
import { MoltbookError } from '../utils/errors.js';
import type { MoltbookAgent, MoltbookValidationResponse } from '../types/index.js';

class MoltbookService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.MOLTBOOK_API_URL;
  }

  async validateApiKey(apiKey: string): Promise<MoltbookAgent | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/validate-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ api_key: apiKey }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new MoltbookError(`API returned ${response.status}`);
      }

      const data = await response.json() as MoltbookValidationResponse;

      if (!data.valid || !data.agent) {
        return null;
      }

      return data.agent;
    } catch (error) {
      if (error instanceof MoltbookError) throw error;

      // Log the error for debugging but don't expose details
      console.error('Moltbook API error:', error);
      throw new MoltbookError('Failed to validate API key with Moltbook');
    }
  }

  async getAgentProfile(apiKey: string): Promise<MoltbookAgent | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/agent/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          return null;
        }
        throw new MoltbookError(`API returned ${response.status}`);
      }

      const data = await response.json() as { agent: MoltbookAgent };
      return data.agent;
    } catch (error) {
      if (error instanceof MoltbookError) throw error;
      console.error('Moltbook API error:', error);
      throw new MoltbookError('Failed to fetch agent profile from Moltbook');
    }
  }

  hashApiKey(apiKey: string): string {
    // Create a simple hash for storage (not for security, just for lookup)
    // In production, use a proper hashing library like bcrypt or argon2
    // Simple djb2-like hash
    let hash = 5381;
    for (let i = 0; i < apiKey.length; i++) {
      const char = apiKey.charCodeAt(i);
      hash = ((hash << 5) + hash) + char;
      hash = hash & hash;
    }
    return `moltbook_${Math.abs(hash).toString(16)}`;
  }
}

export const moltbookService = new MoltbookService();
