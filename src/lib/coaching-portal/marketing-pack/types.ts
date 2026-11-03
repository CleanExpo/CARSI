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
  /** Where the 30 posts came from: all AI, AI topped up from the template, or all template. */
  source: 'ai' | 'ai+template' | 'template';
  /** AI drafts dropped by the compliance filter. */
  rejectedCount: number;
};

export type MarketingPack = {
  review: SiteReview;
  checklist: ChecklistItem[];
  calendar: SocialCalendar;
  voice: TradeVoice;
  generatedAt: string;
};
