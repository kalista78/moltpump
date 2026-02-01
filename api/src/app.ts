import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { apiRateLimiter } from './middleware/rate-limiter.js';
import { health } from './routes/health.js';
import { agents } from './routes/agents.js';
import { tokens } from './routes/tokens.js';
import { upload } from './routes/upload.js';
import { fees } from './routes/fees.js';
import { posts } from './routes/posts.js';
import { API } from './config/constants.js';
import { env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', timing());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: env.NODE_ENV === 'production'
    ? ['https://moltpump.com', 'https://moltbook.ai']
    : '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
  credentials: true,
}));

// Root redirect
app.get('/', (c) => {
  return c.json({
    name: 'MoltPump API',
    version: '1.0.0',
    skill: '/skill.md',
    docs: `${API.BASE_PATH}/docs`,
    health: `${API.BASE_PATH}/health`,
  });
});

// Serve skill.md for AI agent onboarding
app.get('/skill.md', async (c) => {
  try {
    const skillPath = join(__dirname, '..', 'public', 'skill.md');
    const content = await readFile(skillPath, 'utf-8');
    return c.text(content, 200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    });
  } catch {
    return c.text('# MoltPump Skill\n\nSkill file not found.', 404, {
      'Content-Type': 'text/markdown; charset=utf-8',
    });
  }
});

// API routes
const api = new Hono();

// Apply rate limiter to all API routes except health
api.use('*', async (c, next) => {
  // Skip rate limiting for health checks
  if (c.req.path.includes('/health')) {
    return next();
  }
  return apiRateLimiter(c, next);
});

// Mount routes
api.route('/health', health);
api.route('/agents', agents);
api.route('/tokens', tokens);
api.route('/upload', upload);
api.route('/fees', fees);
api.route('/posts', posts);

// Mount API under versioned path
app.route(API.BASE_PATH, api);

// Error handling
app.onError(errorHandler);
app.notFound(notFoundHandler);

export { app };
