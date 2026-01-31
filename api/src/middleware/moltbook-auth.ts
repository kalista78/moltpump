import { createMiddleware } from 'hono/factory';
import { moltbookService } from '../services/moltbook.service.js';
import { agentService } from '../services/agent.service.js';
import { UnauthorizedError } from '../utils/errors.js';
import type { Agent, MoltbookAgent } from '../types/index.js';

// Extend Hono's context variables type
declare module 'hono' {
  interface ContextVariableMap {
    agent: Agent;
    apiKey: string;
    moltbookAgent: MoltbookAgent;
  }
}

export const moltbookAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    throw new UnauthorizedError('Missing Authorization header');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Invalid Authorization format. Use: Bearer <api_key>');
  }

  const apiKey = authHeader.slice(7);

  if (!apiKey || apiKey.length < 10) {
    throw new UnauthorizedError('Invalid API key');
  }

  // First, check if we have this agent in our database by API key hash
  const apiKeyHash = moltbookService.hashApiKey(apiKey);
  let agent = await agentService.findByApiKeyHash(apiKeyHash);

  if (agent) {
    // Agent exists, update last active time
    await agentService.updateLastActive(agent.id);
    c.set('agent', agent);
    c.set('apiKey', apiKey);
    return next();
  }

  // Agent not in our DB yet - validate with Moltbook
  const moltbookAgent = await moltbookService.validateApiKey(apiKey);

  if (!moltbookAgent) {
    throw new UnauthorizedError('Invalid or expired API key');
  }

  // Check if agent exists by name (in case API key was rotated)
  agent = await agentService.findByMoltbookName(moltbookAgent.name);

  if (agent) {
    // Update the API key hash
    agent = await agentService.update(agent.id, {
      moltbook_api_key_hash: apiKeyHash,
    });
  }

  // If still no agent, they need to register first
  if (!agent) {
    throw new UnauthorizedError(
      'Agent not registered. Please call POST /api/v1/agents/register first'
    );
  }

  c.set('agent', agent);
  c.set('apiKey', apiKey);
  return next();
});

// Lighter auth that doesn't require full registration - for registration endpoint
export const moltbookAuthLight = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    throw new UnauthorizedError('Missing Authorization header');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Invalid Authorization format. Use: Bearer <api_key>');
  }

  const apiKey = authHeader.slice(7);

  if (!apiKey || apiKey.length < 10) {
    throw new UnauthorizedError('Invalid API key');
  }

  // Validate with Moltbook
  const moltbookAgent = await moltbookService.validateApiKey(apiKey);

  if (!moltbookAgent) {
    throw new UnauthorizedError('Invalid or expired API key');
  }

  // Store the validated info in context for the registration handler
  c.set('apiKey', apiKey);
  c.set('moltbookAgent', moltbookAgent);

  return next();
});
