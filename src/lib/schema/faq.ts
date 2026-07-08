/**
 * lib/schema/faq.ts
 * Generates schema.org/FAQPage JSON-LD — the AEO/GEO layer. Answer engines and
 * LLMs lift these Q&A pairs directly, and Google can surface them as FAQ rich
 * results. Answers must be accurate and self-contained (grounded in course
 * content), never marketing fluff.
 *
 * Pass the result to <SchemaMarkup schema={...} />.
 */

import type { SchemaObject } from './shared';

export interface FaqSchemaInput {
  faqs: Array<{ q: string; a: string }>;
}

export function buildFaqSchema({ faqs }: FaqSchemaInput): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };
}
