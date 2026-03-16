/**
 * @carsi/schema — JSON-LD schema.org builders for CARSI Hub
 *
 * Usage:
 *   import { buildJobPostingSchema, buildPersonSchema, buildNewsArticleSchema, buildEventSchema } from '@carsi/schema';
 */

export { buildJobPostingSchema } from './jobPosting.js';
export type { JobPostingData } from './jobPosting.js';

export { buildPersonSchema, buildLocalBusinessSchema } from './person.js';
export type { ProfessionalData } from './person.js';

export { buildNewsArticleSchema } from './newsArticle.js';
export type { NewsArticleData } from './newsArticle.js';

export { buildEventSchema } from './event.js';
export type { IndustryEventData } from './event.js';
