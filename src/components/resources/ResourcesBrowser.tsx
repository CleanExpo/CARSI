'use client';

import { ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  FREE_RESOURCES,
  FREE_RESOURCE_JURISDICTIONS,
  groupResourcesByCategory,
  type FreeResource,
  type ResourceJurisdiction,
} from '@/lib/resources/free-resources';
import {
  RESOURCE_CATEGORIES,
  resourceCategoryLabel,
  type ResourceCategoryId,
} from '@/lib/resources/categories';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2026-10-14" to "14 October 2026" without touching the time zone. */
export function formatReadDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

const SELECT_CLASS =
  'min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none';

function ResourceCard({ item }: { item: FreeResource }) {
  return (
    <li className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.25)]">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
          {item.licence}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{item.format}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
          {item.jurisdiction}
        </span>
      </div>
      <h3 className="mt-3 text-base leading-snug font-semibold text-slate-900">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-1.5 hover:text-[#146fc2] focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none"
        >
          <span>
            {item.title}
            <span className="sr-only"> (opens the publisher&rsquo;s site in a new tab)</span>
          </span>
          <ExternalLink className="mt-1 h-4 w-4 shrink-0" aria-hidden />
        </a>
      </h3>
      <p className="mt-1 text-sm text-slate-600">{item.publisher}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{item.note}</p>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        {item.attribution}. Checked {formatReadDate(item.readDate)}.
      </p>
    </li>
  );
}

export function ResourcesBrowser() {
  const [category, setCategory] = useState<'all' | ResourceCategoryId>('all');
  const [jurisdiction, setJurisdiction] = useState<'all' | ResourceJurisdiction>('all');

  const visible = useMemo(
    () =>
      FREE_RESOURCES.filter(
        (item) =>
          (category === 'all' || item.category === category) &&
          (jurisdiction === 'all' || item.jurisdiction === jurisdiction)
      ),
    [category, jurisdiction]
  );

  const groups = useMemo(
    () =>
      groupResourcesByCategory(
        visible,
        RESOURCE_CATEGORIES.map((c) => c.id)
      ),
    [visible]
  );

  return (
    <div>
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <label htmlFor="resource-category" className="mb-1 block text-sm font-medium">
            Category
          </label>
          <select
            id="resource-category"
            className={SELECT_CLASS}
            value={category}
            onChange={(e) => setCategory(e.target.value as 'all' | ResourceCategoryId)}
          >
            <option value="all">All categories</option>
            {RESOURCE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="resource-jurisdiction" className="mb-1 block text-sm font-medium">
            Jurisdiction
          </label>
          <select
            id="resource-jurisdiction"
            className={SELECT_CLASS}
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value as 'all' | ResourceJurisdiction)}
          >
            <option value="all">All jurisdictions</option>
            {FREE_RESOURCE_JURISDICTIONS.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-600" role="status">
        Showing {visible.length} of {FREE_RESOURCES.length} resources
      </p>

      {groups.length === 0 ? (
        <p className="mt-8 text-slate-700">
          No resources match those filters. Try a different jurisdiction or category.
        </p>
      ) : (
        groups.map((group) => (
          <section
            key={group.category}
            id={group.category}
            aria-labelledby={`${group.category}-heading`}
            className="mt-10 scroll-mt-24"
          >
            <h2 id={`${group.category}-heading`} className="text-xl font-semibold text-slate-900">
              {resourceCategoryLabel(group.category)}
            </h2>
            <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <ResourceCard key={item.id} item={item} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
