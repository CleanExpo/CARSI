/**
 * CARSI Hub — News Feed RSS Ingestion Worker (UNI-81)
 *
 * Entrypoint. Starts:
 * - BullMQ fetch + AI workers
 * - node-cron scheduler that triggers RSS fetches at configurable intervals
 */

import cron from 'node-cron';
import { fetchWorker, aiWorker, enqueueAllSources } from './queues.js';
import { pool } from './db.js';
import { config } from './config.js';

console.log('[news-worker] Starting CARSI News Feed Ingestion Worker');
console.log('[news-worker] Redis:', config.redisUrl.replace(/\/\/.*@/, '//***@'));
console.log('[news-worker] Relevance threshold:', config.relevanceThreshold);
console.log('[news-worker] AI queue concurrency:', config.aiQueueConcurrency);

// Kick off an immediate fetch on startup
enqueueAllSources().catch((err) => {
  console.error('[news-worker] Initial fetch enqueue failed:', err);
});

// Schedule hourly re-fetch of all active sources
// (individual source intervals are respected via the last_fetched_at check)
cron.schedule('0 * * * *', () => {
  console.log('[scheduler] Hourly trigger — enqueueing all sources');
  enqueueAllSources().catch((err) => {
    console.error('[scheduler] Enqueue failed:', err);
  });
});

// Log worker events
fetchWorker.on('completed', (job) => {
  console.log(`[fetch-worker] Job ${job.id} completed`);
});

fetchWorker.on('failed', (job, err) => {
  console.error(`[fetch-worker] Job ${job?.id} failed:`, err.message);
});

aiWorker.on('failed', (job, err) => {
  console.error(`[ai-worker] Job ${job?.id} failed:`, err.message);
});

// Graceful shutdown
async function shutdown() {
  console.log('[news-worker] Shutting down...');
  await Promise.all([fetchWorker.close(), aiWorker.close(), pool.end()]);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('[news-worker] Ready. Workers and cron scheduler running.');
