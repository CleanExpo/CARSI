/**
 * BullMQ queue definitions for the news ingestion pipeline.
 *
 * fetch-queue  — one job per news_feed_sources row; triggers RSS fetch + dedup
 * ai-queue     — one job per new article; calls Claude Haiku and inserts to DB
 */

import { Queue, Worker, Job } from 'bullmq';
import RssParser from 'rss-parser';
import { config } from './config.js';
import { processArticle } from './aiProcessor.js';
import {
  getActiveSources,
  guidExists,
  insertArticle,
  markSourceFetched,
  type FeedSource,
} from './db.js';

const connection = { url: config.redisUrl };
const parser = new RssParser({ timeout: 10_000 });

// ---------------------------------------------------------------------------
// Queues
// ---------------------------------------------------------------------------

export const fetchQueue = new Queue('news-fetch', { connection });
export const aiQueue = new Queue('news-ai', { connection });

// ---------------------------------------------------------------------------
// Fetch worker — parses RSS and enqueues new articles for AI processing
// ---------------------------------------------------------------------------

interface FetchJobData {
  source: FeedSource;
}

interface AiJobData {
  sourceId: string;
  sourceName: string;
  guid: string;
  originalTitle: string;
  sourceUrl: string;
  author: string | null;
  publishedAt: string | null;
  imageUrl: string | null;
  contentSnippet: string | null;
}

export const fetchWorker = new Worker<FetchJobData>(
  'news-fetch',
  async (job: Job<FetchJobData>) => {
    const { source } = job.data;
    console.log(`[fetch] Processing source: ${source.name} (${source.rss_url})`);

    let feed: Awaited<ReturnType<typeof parser.parseURL>>;
    try {
      feed = await parser.parseURL(source.rss_url);
    } catch (err) {
      console.error(`[fetch] Failed to parse ${source.rss_url}:`, err);
      return;
    }

    let enqueued = 0;
    for (const item of feed.items ?? []) {
      const guid = item.guid ?? item.link ?? item.title;
      if (!guid) continue;

      // Dedup check
      if (await guidExists(guid)) continue;

      const jobData: AiJobData = {
        sourceId: source.id,
        sourceName: source.name,
        guid,
        originalTitle: item.title ?? 'Untitled',
        sourceUrl: item.link ?? '',
        author: item.author ?? item.creator ?? null,
        publishedAt: item.pubDate ?? item.isoDate ?? null,
        imageUrl: item.enclosure?.url ?? item['media:content']?.url ?? null,
        contentSnippet: item.contentSnippet ?? item.content ?? null,
      };

      await aiQueue.add('process-article', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      });
      enqueued++;
    }

    await markSourceFetched(source.id);
    console.log(`[fetch] ${source.name}: ${enqueued} new articles enqueued`);
  },
  { connection, concurrency: 5 }
);

// ---------------------------------------------------------------------------
// AI worker — calls Claude Haiku and inserts processed article to DB
// ---------------------------------------------------------------------------

export const aiWorker = new Worker<AiJobData>(
  'news-ai',
  async (job: Job<AiJobData>) => {
    const d = job.data;
    console.log(`[ai] Processing article: ${d.originalTitle}`);

    const result = await processArticle(
      d.originalTitle,
      d.contentSnippet ?? undefined,
      d.sourceName
    );

    await insertArticle({
      source_id: d.sourceId,
      guid: d.guid,
      original_title: d.originalTitle,
      source_url: d.sourceUrl,
      author: d.author,
      published_at: d.publishedAt ? new Date(d.publishedAt) : null,
      image_url: d.imageUrl,
      ai_title: result.ai_title,
      ai_summary: result.ai_summary,
      ai_tags: result.ai_tags,
      industry_categories: result.industry_categories,
      relevance_score: result.relevance_score,
      is_featured: result.relevance_score >= 0.85,
      published: result.relevance_score >= config.relevanceThreshold,
    });

    console.log(
      `[ai] Inserted: "${result.ai_title}" (score=${result.relevance_score.toFixed(2)}, published=${result.relevance_score >= config.relevanceThreshold})`
    );
  },
  { connection, concurrency: config.aiQueueConcurrency }
);

// ---------------------------------------------------------------------------
// Enqueue all active sources into the fetch queue
// ---------------------------------------------------------------------------

export async function enqueueAllSources(): Promise<void> {
  const sources = await getActiveSources();
  console.log(`[scheduler] Enqueueing ${sources.length} active sources`);
  for (const source of sources) {
    await fetchQueue.add(
      `fetch-${source.id}`,
      { source },
      {
        jobId: `fetch-${source.id}`, // dedup by source id
        attempts: 2,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: { count: 20 },
        removeOnFail: { count: 20 },
      }
    );
  }
}
