/**
 * lib/schema/newsArticle.ts
 * Generates schema.org/NewsArticle JSON-LD from news_articles rows.
 * Pass the result to <SchemaMarkup schema={...} />.
 */

import type { SchemaObject } from './shared';

export interface NewsArticleSchemaInput {
  headline: string;
  description?: string;
  url: string;
  image?: string;
  datePublished?: string; // ISO 8601
  authorName?: string;
  /** Defaults to "CARSI" */
  publisherName?: string;
  keywords?: string[];
}

export function buildNewsArticleSchema(input: NewsArticleSchemaInput): SchemaObject {
  const { headline, description, url, image, datePublished, authorName, publisherName, keywords } =
    input;

  const schema: SchemaObject = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline,
    url,
    inLanguage: 'en-AU',
    publisher: {
      '@type': 'Organization',
      name: publisherName ?? 'CARSI',
      url: 'https://carsi.com.au',
    },
  };

  if (description) schema.description = description;
  if (image) schema.image = image;
  if (datePublished) schema.datePublished = datePublished;
  if (authorName) schema.author = { '@type': 'Person', name: authorName };
  if (keywords && keywords.length > 0) schema.keywords = keywords.join(', ');

  return schema;
}
