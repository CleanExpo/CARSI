/**
 * JSON-LD NewsArticle schema builder (schema.org)
 * Used by CARSI Hub news pages for rich results.
 */

export interface NewsArticleData {
  id: string;
  ai_title: string;
  ai_summary?: string | null;
  source_url?: string | null;
  author?: string | null;
  published_at?: Date | string | null;
  image_url?: string | null;
  industry_categories?: string[];
}

export function buildNewsArticleSchema(article: NewsArticleData): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.ai_title,
    ...(article.ai_summary ? { description: article.ai_summary } : {}),
    ...(article.source_url ? { url: article.source_url } : {}),
    ...(article.published_at
      ? { datePublished: new Date(article.published_at).toISOString() }
      : {}),
    ...(article.image_url
      ? {
          image: {
            '@type': 'ImageObject',
            url: article.image_url,
          },
        }
      : {}),
    publisher: {
      '@type': 'Organization',
      name: 'CARSI Hub',
      url: 'https://carsi.com.au',
      logo: {
        '@type': 'ImageObject',
        url: 'https://carsi.com.au/logo.png',
      },
    },
  };

  if (article.author) {
    schema.author = { '@type': 'Person', name: article.author };
  }

  if (article.industry_categories?.length) {
    schema.about = article.industry_categories.map((cat) => ({
      '@type': 'Thing',
      name: cat,
    }));
  }

  return JSON.parse(JSON.stringify(schema));
}
