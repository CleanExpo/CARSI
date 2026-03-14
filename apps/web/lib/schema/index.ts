/**
 * lib/schema/index.ts
 * Centralised schema.org JSON-LD module for CARSI Hub Phase 1.
 *
 * Usage pattern:
 *   import { buildEventSchema, SchemaMarkup } from '@/lib/schema';
 *   <SchemaMarkup schema={buildEventSchema({ name, startDate, url })} />
 */

export { SchemaMarkup } from './shared';
export type { SchemaObject } from './shared';

export { buildEventSchema } from './event';
export type { EventSchemaInput } from './event';

export { buildJobPostingSchema } from './jobPosting';
export type { JobPostingSchemaInput } from './jobPosting';

export { buildNewsArticleSchema } from './newsArticle';
export type { NewsArticleSchemaInput } from './newsArticle';

export { buildPersonSchema, buildLocalBusinessSchema } from './person';
export type { PersonSchemaInput, LocalBusinessSchemaInput } from './person';

export { buildOrganizationSchema } from './organization';
export type { OrganizationSchemaInput } from './organization';
