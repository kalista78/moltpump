import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { moltbookAuth } from '../middleware/moltbook-auth.js';
import { moltbookService } from '../services/moltbook.service.js';
import { listMoltbookPostsQuerySchema } from '../schemas/posts.js';

const posts = new Hono();

/**
 * GET /posts/moltbook
 * Fetch the authenticated agent's Moltbook posts
 */
posts.get(
  '/moltbook',
  moltbookAuth,
  zValidator('query', listMoltbookPostsQuerySchema),
  async (c) => {
    const agent = c.get('agent');
    const apiKey = c.get('apiKey');
    const { page, limit } = c.req.valid('query');

    const { posts: postList, pagination } = await moltbookService.getPostsByAuthor(
      apiKey,
      agent.moltbook_name,
      { page, limit }
    );

    return c.json({
      success: true,
      data: postList,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
      },
    });
  }
);

export { posts };
