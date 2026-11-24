import { MetadataRoute } from 'next';
import { getPublicSiteUrl } from '@/lib/env/public-url';

// One list of private paths. A crawler that finds a group naming it reads only that group,
// so the default group and every named AI crawler group must all carry this same list.
const PRIVATE_PATHS = [
  '/admin/',
  '/instructor/',
  '/student/',
  '/dashboard/',
  '/api/',
  '/workflows',
  '/workflows/',
  '/design-system',
  '/prd',
  '/agents',
  '/login',
  '/register',
  '/forgot-password',
];

// AI crawlers — allow for GEO visibility
const AI_CRAWLERS = [
  'OAI-SearchBot',
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  // Perplexity's user-initiated fetch (distinct from the index crawler) —
  // required to be cited in live Perplexity answers.
  'Perplexity-User',
  // Claude's search + user-fetch agents (distinct from the ClaudeBot
  // training crawler) — required to be cited in Claude's web answers.
  'Claude-SearchBot',
  'Claude-User',
  'CCBot',
  'Google-Extended',
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
