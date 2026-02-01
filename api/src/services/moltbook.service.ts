import { env } from '../config/env.js';
import { MoltbookError } from '../utils/errors.js';
import type {
  MoltbookAgent,
  MoltbookValidationResponse,
  MoltbookPost,
  MoltbookPostsResponse,
  MoltbookPostResponse,
} from '../types/index.js';

class MoltbookService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.MOLTBOOK_API_URL;
  }

  /**
   * Validate an API key by calling GET /agents/me
   * Returns the agent profile if valid, null if invalid
   */
  async validateApiKey(apiKey: string): Promise<MoltbookAgent | null> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new MoltbookError(`API returned ${response.status}`);
      }

      const data = await response.json() as MoltbookValidationResponse;

      if (!data.success || !data.agent) {
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

  /**
   * Get an agent's profile by name (includes Twitter/X info in owner field)
   */
  async getAgentProfile(apiKey: string, agentName: string): Promise<MoltbookAgent | null> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/profile?name=${encodeURIComponent(agentName)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          return null;
        }
        throw new MoltbookError(`API returned ${response.status}`);
      }

      const data = await response.json() as MoltbookValidationResponse;

      if (!data.success || !data.agent) {
        return null;
      }

      return data.agent;
    } catch (error) {
      if (error instanceof MoltbookError) throw error;
      console.error('Moltbook API error:', error);
      throw new MoltbookError('Failed to fetch agent profile from Moltbook');
    }
  }

  /**
   * Get the Twitter/X handle for an agent
   * Calls the profile endpoint which includes owner info
   */
  async getAgentTwitterHandle(apiKey: string, agentName: string): Promise<string | null> {
    const profile = await this.getAgentProfile(apiKey, agentName);
    return profile?.owner?.x_handle || null;
  }

  /**
   * Hash API key for local storage/lookup
   * Uses djb2-like hash - not for security, just for indexing
   */
  hashApiKey(apiKey: string): string {
    let hash = 5381;
    for (let i = 0; i < apiKey.length; i++) {
      const char = apiKey.charCodeAt(i);
      hash = ((hash << 5) + hash) + char;
      hash = hash & hash;
    }
    return `moltbook_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Fetch posts by an agent's name
   */
  async getPostsByAuthor(
    apiKey: string,
    authorName: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ posts: MoltbookPost[]; pagination: { page: number; limit: number; total: number } }> {
    const { page = 1, limit = 20 } = options;

    try {
      const params = new URLSearchParams({
        author: authorName,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`${this.baseUrl}/posts?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new MoltbookError('Invalid or expired API key');
        }
        throw new MoltbookError(`API returned ${response.status}`);
      }

      const data = await response.json() as MoltbookPostsResponse;

      if (!data.success) {
        throw new MoltbookError(data.error || 'Failed to fetch posts');
      }

      return {
        posts: data.data || [],
        pagination: data.pagination || { page, limit, total: 0 },
      };
    } catch (error) {
      if (error instanceof MoltbookError) throw error;
      console.error('Moltbook API error:', error);
      throw new MoltbookError('Failed to fetch posts from Moltbook');
    }
  }

  /**
   * Fetch a specific post by ID
   */
  async getPostById(apiKey: string, postId: string): Promise<MoltbookPost | null> {
    try {
      const response = await fetch(`${this.baseUrl}/posts/${encodeURIComponent(postId)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new MoltbookError('Invalid or expired API key');
        }
        if (response.status === 404) {
          return null;
        }
        throw new MoltbookError(`API returned ${response.status}`);
      }

      const data = await response.json() as MoltbookPostResponse;

      if (!data.success || !data.data) {
        return null;
      }

      return data.data;
    } catch (error) {
      if (error instanceof MoltbookError) throw error;
      console.error('Moltbook API error:', error);
      throw new MoltbookError('Failed to fetch post from Moltbook');
    }
  }

  /**
   * Generate Moltbook post URL
   */
  getPostUrl(postId: string): string {
    return `https://www.moltbook.com/posts/${postId}`;
  }
}

export const moltbookService = new MoltbookService();
