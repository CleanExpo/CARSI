import { MetadataRoute } from 'next';
import { getPublicSiteUrl } from '@/lib/env/public-url';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
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
        ],
      },
      // AI crawlers — allow for GEO visibility
      {
        userAgent: 'OAI-SearchBot',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      // Perplexity's user-initiated fetch (distinct from the index crawler) —
      // required to be cited in live Perplexity answers.
      {
        userAgent: 'Perplexity-User',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      // Claude's search + user-fetch agents (distinct from the ClaudeBot
      // training crawler) — required to be cited in Claude's web answers.
      {
        userAgent: 'Claude-SearchBot',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'Claude-User',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'CCBot',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
