/** GP-634 (Coaching advantage A7): shared shapes for a member's AI marketing pack. */

/** The member's trade voice: who they are, what they do and where. Drives every draft. */
export type TradeVoice = {
  businessName: string;
  trade: string;
  town: string;
  services: string;
};

export type SiteFetchResult = {
  ok: boolean;
  status: number;
  html: string | null;
  /** Final URL after redirects, when known. */
  finalUrl?: string;
  error?: string;
};

/** One on-page or profile check the review ran, pass or fail. */
export type SiteCheck = { id: string; label: string; passed: boolean };

/** Shape follows the seo-page-fix / seo-gbp-audit output: issue, why it matters, how to fix. */
export type MarketingFix = {
  id: string;
  rank: number;
  area: 'website' | 'google-business-profile';
  title: string;
  why: string;
  how: string;
  /** 1 (low) to 3 (high): how much it helps a local customer find and choose the business. */
  impact: 1 | 2 | 3;
  /** 1 (quick) to 3 (needs help): how hard it is for the member to do. */
  effort: 1 | 2 | 3;
  score: number;
};

export type SiteReview = {
  websiteUrl: string | null;
  googleBusinessUrl: string | null;
  siteReadable: boolean;
  summary: string;
  checks: SiteCheck[];
  fixes: MarketingFix[];
};

export type ChecklistItem = { id: string; label: string; detail: string; done: boolean };

export type CalendarPost = {
  day: number;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  theme: string;
  caption: string;
  hashtags: string[];
};

export type CalendarCandidate = { theme: string; caption: string; hashtags: string[] };

export type SocialCalendar = {
  posts: CalendarPost[];
  /** Vetted templates only; no model text reaches the member calendar. */
  source: 'template';
  /** Kept for stored-pack shape; always 0 now that no drafts are filtered. */
  rejectedCount: number;
  /**
   * False when the member's trade has no vetted label, so the posts use general trade wording.
   * The page says so rather than presenting them as written for that trade (Codex P1, e9248b38).
   */
  tradeMatched: boolean;
};

export type MarketingPack = {
  review: SiteReview;
  checklist: ChecklistItem[];
  calendar: SocialCalendar;
  voice: TradeVoice;
  generatedAt: string;
};
