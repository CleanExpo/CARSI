/**
 * GP-634: 30-day social calendar in the member's trade voice, built only from a vetted,
 * claim-free template set; the only member-derived text is a trade label from a fixed list.
 * No model text reaches the calendar: four review rounds showed a word filter cannot prove
 * free-form AI copy is free of earnings, guarantee or outcome claims. AI drafting can return
 * behind a coach approval step (see RESULT.md for GP-634).
 */
import { isCompliantCopy } from './compliance';
import { sanitizeVoice } from './site-review';
import type { CalendarCandidate, CalendarPost, SocialCalendar, TradeVoice } from './types';

export const CALENDAR_DAYS = 30;

function tag(s: string): string {
  const t = s.replace(/[^\p{L}\p{N}]/gu, '');
  return t ? `#${t}` : '';
}

/** Deterministic, claim-free month of posts built from the trade voice alone. */
export function buildFallbackPosts(rawVoice: TradeVoice): CalendarCandidate[] {
  const voice = sanitizeVoice(rawVoice);
  // The trade label is only ever used as "<label> work" with no article in front of it, so every
  // label (and the empty fallback) reads correctly: "plumbing work", "air conditioning work",
  // "trade work". Every other line is either general advice or a fill-in prompt in [brackets]:
  // nothing asserts a job, a customer, a habit or a season the member has not supplied.
  const work = voice.trade ? `${voice.trade} work` : 'trade work';
  const tags = voice.trade ? [tag(voice.trade)] : [];

  const lines: Array<[string, string]> = [
    [
      'Who we are',
      `G'day! We do ${work}. Over the next month we'll share what we do and a few tips for looking after your place.`,
    ],
    [
      'Tip',
      `Quick tip: deal with small problems early. Ask us if you're not sure what to look for.`,
    ],
    [
      'Behind the scenes',
      `Behind the scenes: [add a photo and one line about a real job you did this week].`,
    ],
    [
      'Question',
      `What's one thing you'd like to know about ${work}? Drop it in the comments and we'll answer it in a post this month.`,
    ],
    [
      'Meet the team',
      `Meet the people behind the business: [add your name, a photo and one true line about you or your team].`,
    ],
    [
      'Tip',
      `Before you book any ${work}, ask what's included, how long it takes and what you need to do to get ready.`,
    ],
    [
      'Local',
      `The areas we cover: [list the suburbs you really service]. Tell us your suburb in the comments and we'll let you know.`,
    ],
    [
      'Seasonal',
      `A change of season is a good time to check on the things you only think about once a year. [Add what you check on a visit.]`,
    ],
    [
      'Job story',
      `Job story: [describe a real recent job in one or two lines, with the customer's permission].`,
    ],
    [
      'How we work',
      `How booking with us works: [list your real booking steps, for example how you quote and confirm a time].`,
    ],
    [
      'Tip',
      `Three things to ask before you book ${work}: are they local, are they insured, and do they explain the job in plain English?`,
    ],
    [
      'Question',
      `Have you had ${work} done before? What made it a good or bad experience? We're keen to hear.`,
    ],
    [
      'Behind the scenes',
      `Gear check: [add a photo of your gear and one line about a tool you use].`,
    ],
    [
      'Myth or fact',
      `Myth or fact: "you only need ${work} when something looks wrong." [Say whether this is a myth or a fact in your trade, and why.]`,
    ],
    [
      'Thank you',
      `A thank-you post: [if you have had bookings, referrals or reviews, thank those people here; otherwise skip this post].`,
    ],
    ['Tip', `Care tip: [add one care tip you give your customers between visits].`],
    ['Local', `Spotted around the area this week: [add a local photo you took].`],
    [
      'Job story',
      `Before and after: [add your own before and after photos from a real job, with the customer's permission].`,
    ],
    [
      'Question',
      `Poll time: when do you usually think about ${work}? At the change of season, before a big event, or when something goes wrong?`,
    ],
    ['Training', `Training: [add a course or skill you are really working on, or skip this post].`],
    [
      'Tip',
      `Safety first: if a job involves electrics, heights or chemicals, use someone trained to do it.`,
    ],
    [
      'Behind the scenes',
      `What happens after we pack up: [describe what you really do at the end of a job].`,
    ],
    [
      'Local',
      `Supporting local: [give a shout-out to a local business you really rate, or skip this post].`,
    ],
    [
      'How we work',
      `What to expect on the day: [describe how your visits really run, step by step].`,
    ],
    [
      'Tip',
      `After-hours tip: [add one thing a customer can safely do themselves until a professional arrives, or skip this post].`,
    ],
    [
      'Question',
      `What's the one question about ${work} you've always wanted to ask? No silly questions here.`,
    ],
    [
      'Reviews',
      `If we've done a job for you, a short Google review helps other locals find a business they can trust. Thank you.`,
    ],
    [
      'Job story',
      `Small jobs welcome: [add a real small job you did recently, or tell people which small jobs you take on].`,
    ],
    [
      'Seasonal',
      `Planning ahead: if you know you'll need ${work} later in the year, message us and we'll find a time that suits.`,
    ],
    ['Booking', `Need ${work}? Send us a message or give us a call and we'll talk you through it.`],
  ];
  return lines.map(([theme, caption]) => ({ theme, caption, hashtags: tags }));
}

function isoDay(start: Date, offset: number): string {
  const d = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + offset)
  );
  return d.toISOString().slice(0, 10);
}

/** The template set filled with neutral wording only; proven claim-free by its own test. */
const NEUTRAL_VOICE: TradeVoice = { businessName: '', trade: '', town: '', services: '' };

const isCompliantPost = (c: CalendarCandidate) =>
  isCompliantCopy(`${c.theme} ${c.caption} ${c.hashtags.join(' ')}`);

export function assembleCalendar(voice: TradeVoice, startDate: Date): SocialCalendar {
  // Member-supplied names are the only variable text. A post they make non-compliant (a town of
  // "1" becomes the tag #1) is replaced by the same template in neutral wording, so the member
  // always gets 30 compliant posts (Codex P1, head 0b717beb).
  const neutral = buildFallbackPosts(NEUTRAL_VOICE);
  const vetted = buildFallbackPosts(voice).map((c, i) =>
    isCompliantPost(c) ? c : neutral[i % neutral.length]
  );
  const chosen: CalendarCandidate[] = [];
  for (let i = 0; chosen.length < CALENDAR_DAYS && vetted.length > 0; i += 1) {
    chosen.push(vetted[i % vetted.length]);
  }
  const posts: CalendarPost[] = chosen.map((c, idx) => ({
    day: idx + 1,
    date: isoDay(startDate, idx),
    theme: c.theme,
    caption: c.caption,
    hashtags: c.hashtags,
  }));
  return {
    posts,
    source: 'template',
    rejectedCount: 0,
    tradeMatched: Boolean(sanitizeVoice(voice).trade),
  };
}
