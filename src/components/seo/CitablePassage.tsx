import type { ReactNode } from 'react';

/**
 * Maps to the `speakable.cssSelector` list declared in `ArticleSchema`
 * (JsonLd.tsx): `.article-summary`, `.faq-answer`, `.key-takeaway`. That
 * schema was previously non-functional — it pointed at classes nothing in
 * the app ever rendered, so search engines/AI assistants extracting
 * "speakable"/citable content via those selectors found nothing (GP-462).
 *
 * Wrap any answer, summary or key-fact passage that should be citable in
 * AEO/voice-answer contexts in this component instead of a bare <p>, so the
 * schema and the DOM stay in sync by construction.
 */
export type CitablePassageVariant = 'summary' | 'faq-answer' | 'key-takeaway';

const VARIANT_CLASS: Record<CitablePassageVariant, string> = {
  summary: 'article-summary',
  'faq-answer': 'faq-answer',
  'key-takeaway': 'key-takeaway',
};

interface CitablePassageProps {
  variant: CitablePassageVariant;
  children: ReactNode;
  className?: string;
}

export function CitablePassage({ variant, children, className }: CitablePassageProps) {
  const classes = [VARIANT_CLASS[variant], className].filter(Boolean).join(' ');
  return <p className={classes}>{children}</p>;
}
