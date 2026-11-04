'use client';

import { CheckCircle2, Circle, Download, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  coachingCard,
  coachingCardTitle,
  coachingEyebrow,
  coachingMuted,
  coachingPage,
  coachingPrimaryBtn,
  coachingSecondaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import { useCoachingPortal } from '@/components/coaching-portal/CoachingPortalContext';
import { coachingPortalPath } from '@/lib/coaching-portal/coaching-portal-paths';
import { MARKETING_PACK_DOWNLOADS } from '@/lib/coaching-portal/marketing-pack/downloads';
import type {
  ChecklistItem,
  SiteReview,
  SocialCalendar,
  TradeVoice,
} from '@/lib/coaching-portal/marketing-pack/types';

type Pack = {
  id: string;
  review: SiteReview;
  checklist: ChecklistItem[];
  calendar: SocialCalendar;
  voice: TradeVoice;
  generatedAt: string;
};

export function CoachingMarketingPackPage() {
  const { access } = useCoachingPortal();
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState('');
  const [showAllPosts, setShowAllPosts] = useState(false);

  useEffect(() => {
    void fetch('/api/coaching/portal/marketing-pack')
      .then((res) => (res.ok ? res.json() : { pack: null }))
      .then((data: { pack: Pack | null }) => setPack(data.pack))
      .catch(() => setError('Could not load your marketing pack.'))
      .finally(() => setLoading(false));
  }, []);

  async function build() {
    setBuilding(true);
    setError('');
    try {
      const res = await fetch('/api/coaching/portal/marketing-pack', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { pack?: Pack | null; detail?: string };
      if (!res.ok) {
        setError(data.detail ?? 'Could not build your pack.');
      } else {
        setPack(data.pack ?? null);
      }
    } catch {
      setError('Could not build your pack. Check your connection and try again.');
    } finally {
      setBuilding(false);
    }
  }

  const posts = pack ? (showAllPosts ? pack.calendar.posts : pack.calendar.posts.slice(0, 7)) : [];

  return (
    <div className={coachingPage}>
      <p className={coachingEyebrow}>Marketing pack</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
        Your website, Google and social plan
      </h1>
      <p className={`mt-2 max-w-2xl ${coachingMuted}`}>
        Built from your assessment and business profile: a plain-English review of your website and
        Google Business Profile, a local-search checklist and 30 days of draft posts in your voice.
        Your coach approves each fix before it joins your action list.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={coachingPrimaryBtn}
          disabled={!access.canEdit || building}
          onClick={() => void build()}
        >
          {building ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : pack ? (
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          ) : null}
          {building ? 'Building your pack…' : pack ? 'Rebuild my pack' : 'Build my marketing pack'}
        </button>
        {pack ? (
          <span className="text-xs text-slate-500">
            Built {new Date(pack.generatedAt).toLocaleString('en-AU')}
          </span>
        ) : null}
        {!access.canEdit ? (
          <span className={`text-xs ${coachingMuted}`}>
            Available with an active coaching plan.
          </span>
        ) : null}
      </div>
      {building ? (
        <p className={`mt-3 text-xs ${coachingMuted}`}>
          This usually takes under a minute while we read your website and draft your posts.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-amber-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <Loader2 className="mx-auto mt-12 h-8 w-8 animate-spin text-sky-400" aria-label="Loading" />
      ) : !pack ? (
        <section className={`mt-8 ${coachingCard}`}>
          <h2 className={coachingCardTitle}>No pack yet</h2>
          <p className={`mt-1 ${coachingMuted}`}>
            Check your website and Google Business Profile links are in your{' '}
            <Link
              href={coachingPortalPath('/onboarding/profile')}
              className="text-sky-400 hover:underline"
            >
              business profile
            </Link>
            , then build your pack.
          </p>
        </section>
      ) : (
        <div className="mt-8 space-y-6">
          <section className={coachingCard} aria-labelledby="mp-downloads">
            <h2 id="mp-downloads" className={coachingCardTitle}>
              Your resources
            </h2>
            <ul className="mt-4 divide-y divide-white/[0.06]">
              {MARKETING_PACK_DOWNLOADS.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{d.title}</p>
                    <p className={`mt-1 ${coachingMuted}`}>{d.description}</p>
                  </div>
                  <a
                    href={`/api/coaching/portal/marketing-pack/download?item=${d.id}`}
                    className={`${coachingSecondaryBtn} !min-h-9 shrink-0 gap-1.5 !px-3`}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className={coachingCard} aria-labelledby="mp-review">
            <h2 id="mp-review" className={coachingCardTitle}>
              Website and Google review
            </h2>
            <p className={`mt-1 ${coachingMuted}`}>{pack.review.summary}</p>
            {pack.review.fixes.length > 0 ? (
              <ol className="mt-5 space-y-4">
                {pack.review.fixes.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-sky-300">{f.rank}</span>
                      <p className="text-sm font-semibold text-white">{f.title}</p>
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                        {f.area === 'website' ? 'Website' : 'Google profile'}
                      </span>
                    </div>
                    <p className={`mt-2 ${coachingMuted}`}>{f.why}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-200">
                      <span className="font-semibold">How: </span>
                      {f.how}
                    </p>
                  </li>
                ))}
              </ol>
            ) : null}
            <p className={`mt-4 text-xs ${coachingMuted}`}>
              Each fix is sent to your coach as a proposed action. Approved fixes appear in{' '}
              <Link href={coachingPortalPath('/actions')} className="text-sky-400 hover:underline">
                Actions
              </Link>
              .
            </p>
          </section>

          <section className={coachingCard} aria-labelledby="mp-checklist">
            <h2 id="mp-checklist" className={coachingCardTitle}>
              Local-search checklist
            </h2>
            <ul className="mt-4 space-y-3">
              {pack.checklist.map((i) => (
                <li key={i.id} className="flex gap-3">
                  {i.done ? (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                      aria-label="Done"
                    />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-label="To do" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">{i.label}</p>
                    <p className={coachingMuted}>{i.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={coachingCard} aria-labelledby="mp-calendar">
            <h2 id="mp-calendar" className={coachingCardTitle}>
              30-day social calendar
            </h2>
            <p className={`mt-1 ${coachingMuted}`}>
              {pack.calendar.tradeMatched === false
                ? 'We do not have wording for your trade yet, so these drafts use general trade wording. Your coach can help you tailor them.'
                : `Drafts written for ${pack.voice.trade || 'your trade'}.`}{' '}
              Edit them to sound like you and add your own job photos before posting.
            </p>
            <ol className="mt-5 space-y-3">
              {posts.map((p) => (
                <li
                  key={p.day}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <p className="text-xs text-slate-500">
                    <span className="font-mono">Day {p.day}</span> ·{' '}
                    {new Date(`${p.date}T00:00:00`).toLocaleDateString('en-AU', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · {p.theme}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-slate-100">
                    {p.caption}
                  </p>
                  {p.hashtags.length > 0 ? (
                    <p className="mt-1.5 text-xs text-sky-300/80">{p.hashtags.join(' ')}</p>
                  ) : null}
                </li>
              ))}
            </ol>
            {pack.calendar.posts.length > 7 ? (
              <button
                type="button"
                className={`mt-4 ${coachingSecondaryBtn}`}
                onClick={() => setShowAllPosts((v) => !v)}
              >
                {showAllPosts ? 'Show first week' : `Show all ${pack.calendar.posts.length} days`}
              </button>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
