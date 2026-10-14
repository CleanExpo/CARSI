'use client';

import { ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  FREE_RESOURCES,
  FREE_RESOURCE_JURISDICTIONS,
  RESOURCE_STATUS_LABEL,
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

const CATEGORY_IDS = new Set<string>(RESOURCE_CATEGORIES.map((c) => c.id));

function categoryFromHash(hash: string): ResourceCategoryId | null {
  let id: string;
  try {
    id = decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    return null;
  }
  return CATEGORY_IDS.has(id) ? (id as ResourceCategoryId) : null;
}

/** Shown once above the building-code group, in place of per-card applicability claims. */
export const BUILDING_CODE_NOTE =
  'Building code rules differ by state and territory, and editions are amended. Before relying on any document here, confirm with your building surveyor or state building regulator which edition and amendments apply to your project.';

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
        {item.status ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-900">
            {RESOURCE_STATUS_LABEL[item.status]}
          </span>
        ) : null}
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

  const scrollTarget = useRef<ResourceCategoryId | null>(null);
  const shownCategories = useRef<ReadonlySet<ResourceCategoryId>>(new Set());

  // The header's category links point at /resources#<category>. A filter can remove that
  // section, so following the link would change the hash and land nowhere. When a category
  // anchor is followed, relax only the filters that hide it, then scroll to it. Next's Link
  // navigates with pushState (no hashchange), hence the capture-phase click listener as well.
  useEffect(() => {
    const reveal = (id: ResourceCategoryId) => {
      if (shownCategories.current.has(id)) return;
      setCategory((c) => (c === 'all' || c === id ? c : 'all'));
      setJurisdiction((j) =>
        j === 'all' || FREE_RESOURCES.some((i) => i.category === id && i.jurisdiction === j)
          ? j
          : 'all'
      );
      scrollTarget.current = id;
    };
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) {
        return;
      }
      const id = categoryFromHash(url.hash);
      if (id) reveal(id);
    };
    const onHashChange = () => {
      const id = categoryFromHash(window.location.hash);
      if (id) reveal(id);
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const groups = useMemo(
    () =>
      groupResourcesByCategory(
        visible,
        RESOURCE_CATEGORIES.map((c) => c.id)
      ),
    [visible]
  );

  // Runs after the relaxed filters have re-rendered the section. When nothing was hidden the
  // groups do not change and the browser's own anchor scroll already applies.
  useEffect(() => {
    shownCategories.current = new Set(groups.map((g) => g.category));
    const id = scrollTarget.current;
    if (!id) return;
    scrollTarget.current = null;
    document.getElementById(id)?.scrollIntoView?.({ block: 'start' });
  }, [groups]);

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
            {group.category === 'building-codes' ? (
              <p
                data-testid="building-code-note"
                className="mt-3 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950"
              >
                {BUILDING_CODE_NOTE}
              </p>
            ) : null}
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
