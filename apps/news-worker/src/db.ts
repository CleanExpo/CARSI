/**
 * Lightweight PostgreSQL client for the news worker.
 * Uses the `pg` pool directly (no ORM overhead in the worker).
 */

import { Pool } from 'pg';
import { config } from './config.js';

export const pool = new Pool({ connectionString: config.databaseUrl });

export interface FeedSource {
  id: string;
  name: string;
  rss_url: string;
  industry_categories: string[];
  fetch_interval_minutes: number;
}

export interface ArticleInsert {
  source_id: string;
  guid: string;
  original_title: string;
  source_url: string;
  author: string | null;
  published_at: Date | null;
  image_url: string | null;
  ai_title: string | null;
  ai_summary: string | null;
  ai_tags: string[];
  industry_categories: string[];
  relevance_score: number | null;
  is_featured: boolean;
  published: boolean;
}

export async function getActiveSources(): Promise<FeedSource[]> {
  const { rows } = await pool.query<FeedSource>(
    'SELECT id, name, rss_url, industry_categories, fetch_interval_minutes FROM news_feed_sources WHERE is_active = true ORDER BY fetch_interval_minutes ASC'
  );
  return rows;
}

export async function guidExists(guid: string): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM news_articles WHERE guid = $1) AS exists',
    [guid]
  );
  return rows[0]?.exists ?? false;
}

export async function insertArticle(article: ArticleInsert): Promise<void> {
  await pool.query(
    `INSERT INTO news_articles
       (source_id, guid, original_title, source_url, author, published_at, image_url,
        ai_title, ai_summary, ai_tags, industry_categories, relevance_score, is_featured, published)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (guid) DO NOTHING`,
    [
      article.source_id,
      article.guid,
      article.original_title,
      article.source_url,
      article.author,
      article.published_at,
      article.image_url,
      article.ai_title,
      article.ai_summary,
      JSON.stringify(article.ai_tags),
      JSON.stringify(article.industry_categories),
      article.relevance_score,
      article.is_featured,
      article.published,
    ]
  );
}

export async function markSourceFetched(sourceId: string): Promise<void> {
  await pool.query('UPDATE news_feed_sources SET last_fetched_at = NOW() WHERE id = $1', [
    sourceId,
  ]);
}
