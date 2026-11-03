/**
 * GP-634: 30-day social calendar in the member's trade voice. The model drafts; the compliance
 * filter drops any draft with an earnings, guarantee or superlative claim; a deterministic
 * template tops the calendar up to exactly 30 so a member always receives a full month.
 */
import { MARKETING_COPY_RULES, isCompliantCopy } from './compliance';
import { primaryTown, sanitizeVoice } from './site-review';
import type { CalendarCandidate, CalendarPost, SocialCalendar, TradeVoice } from './types';

export const CALENDAR_DAYS = 30;

export type ChatMessage = { role: 'system' | 'user'; content: string };

export function buildCalendarMessages(rawVoice: TradeVoice): ChatMessage[] {
  const voice = sanitizeVoice(rawVoice);
  const town = primaryTown(voice.town) || voice.town;
  return [
    {
      role: 'system',
      content: [
        "You write social media posts for an Australian trade business, in the owner's own voice:",
        'plain, practical, friendly, first person plural ("we"), short sentences, no hype.',
        'Rules you must follow for every post:',
        ...MARKETING_COPY_RULES.map((r) => `- ${r}`),
        'Reply with a JSON array only, no commentary.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `Business: ${voice.businessName || 'a local trade business'}`,
        `Trade: ${voice.trade || 'trade services'}`,
        `Town: ${town || 'their local area'}`,
        `Services: ${voice.services || voice.trade}`,
        '',
        `Write ${CALENDAR_DAYS + 4} posts for the next month. Mix: practical tips, behind-the-scenes job stories (no customer names or addresses),`,
        'seasonal reminders for the local area, team and community posts, questions to followers, and soft booking reminders.',
        'Each item: {"theme": short label, "caption": 40 to 90 words, "hashtags": up to 4 strings starting with #}.',
      ].join('\n'),
    },
  ];
}

function asCandidate(raw: unknown): CalendarCandidate | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const caption = typeof r.caption === 'string' ? r.caption.trim() : '';
  if (caption.length < 10) return null;
  const theme =
    typeof r.theme === 'string' && r.theme.trim() ? r.theme.trim().slice(0, 80) : 'Post';
  const hashtags = Array.isArray(r.hashtags)
    ? r.hashtags
        .filter((h): h is string => typeof h === 'string')
        .map((h) => h.trim())
        .filter((h) => /^#[\p{L}\p{N}_]{1,40}$/u.test(h))
        .slice(0, 4)
    : [];
  return { theme, caption: caption.slice(0, 1200), hashtags };
}

/** Pull the first JSON array out of a model reply (bare or inside a ``` fence). */
export function parseCalendarResponse(text: string): CalendarCandidate[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(asCandidate).filter((c): c is CalendarCandidate => c !== null);
  } catch {
    return [];
  }
}

function tag(s: string): string {
  const t = s.replace(/[^\p{L}\p{N}]/gu, '');
  return t ? `#${t}` : '';
}

/** Deterministic, claim-free month of posts built from the trade voice alone. */
export function buildFallbackPosts(rawVoice: TradeVoice): CalendarCandidate[] {
  const voice = sanitizeVoice(rawVoice);
  const town = primaryTown(voice.town) || 'our local area';
  const trade = (voice.trade || 'our trade').toLowerCase();
  const name = voice.businessName || 'our team';
  const service =
    (voice.services || voice.trade || 'our work')
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)[0]
      ?.toLowerCase() ?? trade;
  const tags = [tag(town), tag(voice.trade.split(/[&,]/)[0] ?? '')].filter(Boolean);

  const lines: Array<[string, string]> = [
    [
      'Who we are',
      `G'day ${town}. We're ${name}, a local ${trade} business. Over the next month we'll share what we do, how we do it and a few tips for looking after your place.`,
    ],
    [
      'Tip',
      `Quick ${service} tip: deal with small problems early. A little attention now usually means a smaller job later. Ask us if you're not sure what to look for.`,
    ],
    [
      'Behind the scenes',
      `Behind the scenes on a ${service} job in ${town} this week. We start with a walk-through so we can explain what we'll do before we start.`,
    ],
    [
      'Question',
      `What's one thing you'd like to know about ${trade}? Drop it in the comments and we'll answer it in a post this month.`,
    ],
    [
      'Meet the team',
      `Meet the people behind ${name}. We live and work around ${town}, and we turn up on time with the right gear for the job.`,
    ],
    [
      'Tip',
      `Before you book any ${service}, ask what's included, how long it takes and what you need to do to get ready. A good tradie will happily explain.`,
    ],
    [
      'Local',
      `Proud to work across ${town} and the surrounding suburbs. Tell us your suburb in the comments and we'll let you know if we cover it.`,
    ],
    [
      'Seasonal',
      `Change of season in ${town} is a good time to check on the things you only think about once a year. Here's what we look at on a ${service} visit.`,
    ],
    [
      'Job story',
      `A recent ${town} job: the customer called about one problem and we found the cause was somewhere else. Fixing the cause, not just the symptom, is how we work.`,
    ],
    [
      'How we work',
      `How a ${name} booking works: you call or message, we ask a few questions, give you a clear quote, then book a time that suits you.`,
    ],
    [
      'Tip',
      `Three things to check before you call a ${trade} business: are they local, are they insured, and do they explain the job in plain English?`,
    ],
    [
      'Question',
      `Have you had ${service} done before? What made it a good or bad experience? We're always keen to hear.`,
    ],
    [
      'Behind the scenes',
      `Gear check at ${name}. Looking after our equipment means it works properly on your job. Here's a look inside the van.`,
    ],
    [
      'Myth or fact',
      `Myth or fact: "you only need ${service} when something looks wrong." Often the early signs are easy to miss. Ask us what to watch for.`,
    ],
    [
      'Thank you',
      `Thanks to everyone in ${town} who has booked with us, sent a referral or left a review. It means a lot to a small local business.`,
    ],
    [
      'Tip',
      `Looking after things between ${service} visits makes a real difference. Here's our simple routine we share with customers.`,
    ],
    [
      'Local',
      `Spotted around ${town} this week while on the road. We love working in this community.`,
    ],
    [
      'Job story',
      `Before and after from a recent ${service} job in ${town}. No two jobs are the same, so we always explain what to expect before we start.`,
    ],
    [
      'Question',
      `Poll time: when do you usually think about ${service}? Before guests arrive, at the change of season, or when something goes wrong?`,
    ],
    [
      'Training',
      `Our team keeps learning. This month we're brushing up on the latest methods and safety practices for ${trade}.`,
    ],
    [
      'Tip',
      `Safety first: if a ${trade} job involves electrics, heights or chemicals, it's worth getting someone trained to do it.`,
    ],
    [
      'Behind the scenes',
      `What happens after we pack up: we check the work with you, answer questions and leave the place tidy.`,
    ],
    [
      'Local',
      `Supporting local: a shout-out to another ${town} business we rate. Who's your favourite local business?`,
    ],
    [
      'How we work',
      `What to expect on the day: we arrive in the window we booked, explain the plan, do the work and walk you through the result.`,
    ],
    [
      'Tip',
      `If something goes wrong after hours, here's what you can safely do yourself until a professional can get there.`,
    ],
    [
      'Question',
      `What's the one ${trade} question you've always wanted to ask but never have? No silly questions here.`,
    ],
    [
      'Reviews',
      `If we've done a job for you, a short Google review helps other ${town} locals find a business they can trust. Thank you.`,
    ],
    [
      'Job story',
      `Small job, happy customer. Not all jobs are big ones, and we're glad to help with the small stuff around ${town} too.`,
    ],
    [
      'Seasonal',
      `Planning ahead: now is a good time to book ${service} before the busy season. Message us and we'll find a time that suits.`,
    ],
    [
      'Booking',
      `Need ${service} in ${town}? Send us a message or give us a call and we'll talk you through it.`,
    ],
  ];
  return lines.map(([theme, caption]) => ({ theme, caption, hashtags: tags }));
}

function isoDay(start: Date, offset: number): string {
  const d = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + offset)
  );
  return d.toISOString().slice(0, 10);
}

export function assembleCalendar(
  aiCandidates: CalendarCandidate[],
  voice: TradeVoice,
  startDate: Date
): SocialCalendar {
  const accepted: CalendarCandidate[] = [];
  let rejectedCount = 0;
  for (const c of aiCandidates) {
    if (accepted.length >= CALENDAR_DAYS) break;
    if (isCompliantCopy(`${c.theme} ${c.caption} ${c.hashtags.join(' ')}`)) accepted.push(c);
    else rejectedCount += 1;
  }
  const aiCount = accepted.length;
  const fallback = buildFallbackPosts(voice).filter((c) =>
    isCompliantCopy(`${c.theme} ${c.caption}`)
  );
  let i = 0;
  while (accepted.length < CALENDAR_DAYS && fallback.length > 0) {
    accepted.push(fallback[i % fallback.length]);
    i += 1;
  }
  const posts: CalendarPost[] = accepted.slice(0, CALENDAR_DAYS).map((c, idx) => ({
    day: idx + 1,
    date: isoDay(startDate, idx),
    theme: c.theme,
    caption: c.caption,
    hashtags: c.hashtags,
  }));
  const source: SocialCalendar['source'] =
    aiCount === 0 ? 'template' : aiCount >= CALENDAR_DAYS ? 'ai' : 'ai+template';
  return { posts, source, rejectedCount };
}
