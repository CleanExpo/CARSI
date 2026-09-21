'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { dash } from '@/lib/dashboard-light-ui';

const TOPICS = [
  {
    q: 'Where did I stop?',
    a: 'Open Home and use Continue learning.',
  },
  {
    q: 'Where is my certificate?',
    a: 'Open Certificates in the menu to view or download.',
  },
  {
    q: 'How many CECs do I have?',
    a: 'Home shows IICRC CEC progress when you have approved hours.',
  },
  {
    q: 'What should I learn next?',
    a: 'Home and Course catalogue show recommended courses based on your enrolments.',
  },
];

export function HelpTopics() {
  const [q, setQ] = useState('');
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return TOPICS;
    return TOPICS.filter((t) => `${t.q} ${t.a}`.toLowerCase().includes(needle));
  }, [q]);

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="sr-only">Search help articles</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search help articles"
          className={`w-full ${dash.input}`}
        />
      </label>

      {visible.length === 0 ? (
        <p className={dash.muted}>No matching articles. Try Ask Margot or email support.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((t) => (
            <li key={t.q} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-medium text-slate-900">{t.q}</p>
              <p className={`mt-1 text-sm ${dash.muted}`}>{t.a}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3">
        <Link href="/support" className={dash.btnPrimary}>
          Full support guide
        </Link>
        <p className="text-sm text-slate-500">
          Email support@carsi.com.au or use Ask Margot in the corner of the page.
        </p>
      </div>
    </div>
  );
}
