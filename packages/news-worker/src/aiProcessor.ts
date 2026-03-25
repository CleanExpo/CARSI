/**
 * Claude Haiku AI processing for news articles.
 * Returns structured JSON with title, summary, categories, tags, and relevance score.
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';

const client = new Anthropic({
  apiKey: config.anthropicApiKey,
  ...(config.anthropicBaseUrl ? { baseURL: config.anthropicBaseUrl } : {}),
});

export interface AiArticleResult {
  ai_title: string;
  ai_summary: string;
  industry_categories: string[];
  relevance_score: number;
  ai_tags: string[];
}

const INDUSTRY_CATEGORIES = [
  'Restoration',
  'HVAC',
  'Flooring',
  'Indoor Air Quality',
  'Water Damage',
  'Mould Remediation',
  'Carpet & Upholstery Cleaning',
  'Insurance & Claims',
  'Building & Construction',
  'Pest Control',
  'Standards & Compliance',
  'Fire Restoration',
];

const SYSTEM_PROMPT = `You are an AI content classifier for CARSI Hub, Australia's industry portal for disaster restoration, HVAC, flooring, and indoor environment professionals.

Given a news article title and optional content, return a JSON object with:
- ai_title: a clear, informative headline (max 100 chars, title case)
- ai_summary: 2–3 sentence plain-English summary relevant to Australian industry professionals
- industry_categories: array of matching categories from the provided list (1–3 categories max)
- relevance_score: float 0.0–1.0 representing relevance to the Australian restoration/indoor environment industry (0.0 = irrelevant, 1.0 = highly relevant)
- ai_tags: 3–6 lowercase keyword tags (e.g. ["water damage", "iicrc", "drying"])

Return ONLY valid JSON. No markdown, no commentary.`;

export async function processArticle(
  title: string,
  content?: string,
  sourceName?: string
): Promise<AiArticleResult> {
  const userMessage = [
    `Source: ${sourceName ?? 'Unknown'}`,
    `Title: ${title}`,
    content ? `Content snippet: ${content.slice(0, 500)}` : '',
    '',
    `Available industry categories: ${INDUSTRY_CATEGORIES.join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = message.content[0]?.type === 'text' ? message.content[0].text : '{}';

  const parsed = JSON.parse(text) as AiArticleResult;

  // Clamp score
  parsed.relevance_score = Math.max(0, Math.min(1, parsed.relevance_score ?? 0));

  return parsed;
}
