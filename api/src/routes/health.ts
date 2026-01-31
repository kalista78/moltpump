import { Hono } from 'hono';
import { checkDatabaseConnection } from '../db/client.js';
import { checkRpcHealth } from '../utils/solana.js';

const health = new Hono();

health.get('/', async (c) => {
  const [dbHealthy, rpcHealthy] = await Promise.all([
    checkDatabaseConnection(),
    checkRpcHealth(),
  ]);

  const status = dbHealthy ? 'healthy' : 'degraded';
  const statusCode = status === 'healthy' ? 200 : 503;

  return c.json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'connected' : 'disconnected',
      solana_rpc: rpcHealthy ? 'connected' : 'disconnected',
      pumpfun: 'gasless mode - no wallet required',
    },
    version: '1.0.0',
  }, statusCode);
});

health.get('/ready', async (c) => {
  const dbHealthy = await checkDatabaseConnection();

  if (dbHealthy) {
    return c.json({ ready: true }, 200);
  }

  return c.json({
    ready: false,
    checks: {
      database: dbHealthy,
    },
  }, 503);
});

health.get('/live', (c) => {
  return c.json({ alive: true }, 200);
});

export { health };
