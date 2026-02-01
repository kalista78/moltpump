import { serve } from '@hono/node-server';
import { app } from './app.js';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './db/client.js';
import { checkRpcHealth } from './utils/solana.js';
import { schedulerService } from './services/scheduler.service.js';

async function main() {
  console.log('🚀 Starting MoltPump API...');
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Mode: Gasless token launches via Pump.fun API`);

  // Pre-flight checks
  console.log('\n📋 Running pre-flight checks...');

  // Check database connection
  const dbConnected = await checkDatabaseConnection();
  if (dbConnected) {
    console.log('   ✅ Database connected');
  } else {
    console.error('   ❌ Database connection failed');
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  // Check Solana RPC (used for balance lookups, not required for launches)
  const rpcHealthy = await checkRpcHealth();
  if (rpcHealthy) {
    console.log('   ✅ Solana RPC connected');
  } else {
    console.warn('   ⚠️  Solana RPC unavailable (balance lookups will fail)');
  }

  // Start scheduler for background tasks
  console.log('\n⏰ Starting background scheduler...');
  schedulerService.start();

  // Start server
  console.log('\n🌐 Starting HTTP server...');

  serve({
    fetch: app.fetch,
    port: env.PORT,
  }, (info) => {
    console.log(`\n✨ MoltPump API is running!`);
    console.log(`   Local:   http://localhost:${info.port}`);
    console.log(`   Health:  http://localhost:${info.port}/api/v1/health`);
    console.log(`   Skill:   http://localhost:${info.port}/skill.md`);
    console.log('\n📚 API Endpoints:');
    console.log('   GET    /skill.md                - AI agent onboarding instructions');
    console.log('   POST   /api/v1/agents/register  - Register agent');
    console.log('   GET    /api/v1/agents/me        - Get agent profile');
    console.log('   POST   /api/v1/tokens/launch    - Launch token (gasless)');
    console.log('   GET    /api/v1/tokens           - List tokens');
    console.log('   POST   /api/v1/upload/image     - Upload image');
    console.log('\n🤖 Background Tasks:');
    console.log('   Auto-distribute fees every 10 min (threshold: 1 SOL)');
    console.log('');
  });
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  schedulerService.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  schedulerService.stop();
  process.exit(0);
});

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
