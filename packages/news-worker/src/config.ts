/**
 * Environment configuration for the news worker.
 * Reads from process.env / .env file.
 */

import 'dotenv/config';

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/carsi',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  /** Base URL for the Anthropic API (supports local proxy, e.g. http://localhost:18181) */
  anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL,
  /** Minimum relevance score to auto-publish an article (0–1). Default: 0.6 */
  relevanceThreshold: parseFloat(process.env.NEWS_RELEVANCE_THRESHOLD ?? '0.6'),
  /** Max concurrent Claude Haiku workers in the AI queue */
  aiQueueConcurrency: parseInt(process.env.NEWS_AI_CONCURRENCY ?? '10', 10),
} as const;
