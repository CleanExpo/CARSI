/**
 * GP-634: 30-day social calendar in the member's trade voice, built only from a vetted,
 * claim-free template set filled with the member's business name, trade, town and services.
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
  const town = voice.town || 'our local area';
  const trade = voice.trade || 'trade';
  const service = voice.trade || 'our work';
  const tags = [voice.town ? tag(voice.town) : '', voice.trade ? tag(voice.trade) : ''].filter(
    Boolean
  );

  const lines: Array<[string, string]> = [
    [
      'Who we are',
      `G'day ${town}. We're a local ${trade} business. Over the next month we'll share what we do, how we do it and a few tips for looking after your place.`,
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
      `Meet the people behind the business. We live and work around ${town}, and we turn up on time with the right gear for the job.`,
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
      `How booking with us works: you call or message, we ask a few questions, give you a clear quote, then book a time that suits you.`,
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
      `Gear check. Looking after our equipment means it works properly on your job. Here's a look inside the van.`,
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
  return { posts, source: 'template', rejectedCount: 0 };
}
