'use client';

import { useCallback, useEffect, useState } from 'react';

import { COACH_CURRENCIES } from '@/lib/coaching-portal/coaches';

type CoachRow = {
  id: string;
  displayName: string;
  chapterSlug: string;
  chapterName: string;
  currency: string;
  monthlyPriceCents: number | null;
  stripePriceId: string | null;
  notificationEmail: string;
  isDefault: boolean;
  memberCount: number;
};

const surface =
  'rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]';
const input =
  'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35';
const button =
  'rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50';

const EMPTY = {
  displayName: '',
  chapterName: '',
  chapterSlug: '',
  currency: 'usd',
  price: '',
  stripePriceId: '',
  notificationEmail: '',
  coachLoginEmail: '',
  brandColour: '',
  logoUrl: '',
};

function priceText(c: CoachRow): string {
  if (c.monthlyPriceCents == null) return 'Not set';
  return `${c.currency.toUpperCase()} ${(c.monthlyPriceCents / 100).toFixed(2)}/month`;
}

/** Coaching chapters (GP-632): Phill opens partner chapters and assigns members to them. */
export function AdminCoachingChaptersPanel() {
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [assign, setAssign] = useState({ memberEmail: '', coachId: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/business-coaching/coaches');
    if (!res.ok) throw new Error('Failed to load coaches');
    const data = (await res.json()) as { coaches: CoachRow[] };
    return data.coaches;
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((rows) => {
        if (!cancelled) setCoaches(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setMessage(e instanceof Error ? e.message : 'Failed to load coaches');
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function post(url: string, body: unknown): Promise<string | null> {
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) return data.detail ?? 'Request failed';
      setCoaches(await load());
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createCoach() {
    const cents = Math.round(Number(form.price) * 100);
    const error = await post('/api/admin/business-coaching/coaches', {
      displayName: form.displayName,
      chapterName: form.chapterName,
      chapterSlug: form.chapterSlug,
      currency: form.currency,
      monthlyPriceCents: Number.isFinite(cents) ? cents : null,
      stripePriceId: form.stripePriceId || null,
      notificationEmail: form.notificationEmail,
      coachLoginEmail: form.coachLoginEmail,
      brandColour: form.brandColour || null,
      logoUrl: form.logoUrl || null,
    });
    if (error) {
      setMessage(error);
      return;
    }
    setForm(EMPTY);
    setMessage('Chapter created.');
  }

  async function assignMember() {
    const error = await post('/api/admin/business-coaching/coaches/assign', {
      memberEmail: assign.memberEmail,
      coachId: assign.coachId || null,
    });
    setMessage(error ?? 'Member assigned.');
    if (!error) setAssign({ memberEmail: '', coachId: '' });
  }

  const field = (key: keyof typeof EMPTY, placeholder: string) => (
    <input
      className={input}
      placeholder={placeholder}
      aria-label={placeholder}
      value={form[key]}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
    />
  );

  return (
    <section className="px-5 pb-10 sm:px-8">
      <h2 className="text-xl font-bold text-white">Coaching chapters</h2>
      <p className="mt-1 text-sm text-white/55">
        Each partner coach runs a chapter: their name, their members, their price and currency.
        Members with no chapter stay with the default coach.
      </p>
      {message ? <p className="mt-3 text-sm text-amber-300">{message}</p> : null}

      <div className={`mt-4 overflow-x-auto ${surface}`}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs text-white/45">
            <tr>
              <th className="px-4 py-3">Coach</th>
              <th className="px-4 py-3">Chapter</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Coach inbox</th>
              <th className="px-4 py-3">Members</th>
            </tr>
          </thead>
          <tbody>
            {coaches.map((c) => (
              <tr key={c.id} className="border-b border-white/6 text-white/85">
                <td className="px-4 py-3">
                  {c.displayName}
                  {c.isDefault ? <span className="ml-2 text-xs text-white/45">default</span> : null}
                </td>
                <td className="px-4 py-3">
                  {c.chapterName}
                  <div className="text-xs text-white/45">{c.chapterSlug}</div>
                </td>
                <td className="px-4 py-3">
                  {priceText(c)}
                  {c.stripePriceId ? <div className="text-xs text-white/45">{c.stripePriceId}</div> : null}
                </td>
                <td className="px-4 py-3">{c.notificationEmail}</td>
                <td className="px-4 py-3">{c.memberCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className={`p-5 ${surface}`}>
          <h3 className="text-sm font-semibold text-white">Open a partner chapter</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {field('displayName', 'Coach name')}
            {field('chapterName', 'Chapter name')}
            {field('chapterSlug', 'Chapter slug (e.g. us-west)')}
            {field('notificationEmail', 'Coach inbox email')}
            {field('coachLoginEmail', 'Coach CARSI login email')}
            <select
              className={input}
              aria-label="Currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              {COACH_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
            {field('price', 'Monthly price (e.g. 497)')}
            {field('stripePriceId', 'Stripe price id (optional)')}
            {field('brandColour', 'Brand colour #rrggbb (optional)')}
            <div className="sm:col-span-2">{field('logoUrl', 'Logo https URL (optional)')}</div>
          </div>
          <p className="mt-3 text-xs text-white/45">
            Revenue share is not set here. It needs Phill&apos;s sign-off before it is built.
          </p>
          <button type="button" className={`mt-4 ${button}`} disabled={busy} onClick={() => void createCoach()}>
            Create chapter
          </button>
        </div>

        <div className={`p-5 ${surface}`}>
          <h3 className="text-sm font-semibold text-white">Assign a member</h3>
          <div className="mt-3 grid gap-3">
            <input
              className={input}
              placeholder="Member account email"
              aria-label="Member account email"
              value={assign.memberEmail}
              onChange={(e) => setAssign({ ...assign, memberEmail: e.target.value })}
            />
            <select
              className={input}
              aria-label="Chapter"
              value={assign.coachId}
              onChange={(e) => setAssign({ ...assign, coachId: e.target.value })}
            >
              <option value="">Default coach</option>
              {coaches
                .filter((c) => !c.isDefault)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} ({c.chapterName})
                  </option>
                ))}
            </select>
          </div>
          <p className="mt-3 text-xs text-white/45">
            From the next email on, this member&apos;s coach emails, price and dashboard follow the chapter.
          </p>
          <button type="button" className={`mt-4 ${button}`} disabled={busy} onClick={() => void assignMember()}>
            Assign
          </button>
        </div>
      </div>
    </section>
  );
}
