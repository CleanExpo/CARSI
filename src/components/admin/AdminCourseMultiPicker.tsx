'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

import type { AdminCatalogCourseOption } from '@/lib/admin/admin-user-progress';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function AdminCourseMultiPicker({
  courses,
  enrolledSlugs,
  selectedSlugs,
  onSelectionChange,
  disabled,
}: {
  courses: AdminCatalogCourseOption[];
  enrolledSlugs: Set<string>;
  selectedSlugs: Set<string>;
  onSelectionChange: (slugs: Set<string>) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) => c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  }, [courses, query]);

  const grantableCount = useMemo(
    () => courses.filter((c) => !enrolledSlugs.has(c.slug)).length,
    [courses, enrolledSlugs],
  );

  const selectedCourses = useMemo(
    () => courses.filter((c) => selectedSlugs.has(c.slug)),
    [courses, selectedSlugs],
  );

  function toggle(slug: string) {
    if (enrolledSlugs.has(slug) || disabled) return;
    const next = new Set(selectedSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    onSelectionChange(next);
  }

  function selectAllGrantable() {
    if (disabled) return;
    const next = new Set(selectedSlugs);
    for (const c of courses) {
      if (!enrolledSlugs.has(c.slug)) next.add(c.slug);
    }
    onSelectionChange(next);
  }

  function clearSelection() {
    if (disabled) return;
    onSelectionChange(new Set());
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/35" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses by title…"
          disabled={disabled || grantableCount === 0}
          className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/35"
          aria-label="Search courses"
        />
      </div>

      {selectedCourses.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedCourses.map((c) => (
            <button
              key={c.slug}
              type="button"
              disabled={disabled}
              onClick={() => toggle(c.slug)}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#2490ed]/35 bg-[#2490ed]/15 px-2.5 py-1 text-left text-xs font-medium text-[#93c5fd] transition-colors hover:bg-[#2490ed]/25 disabled:opacity-50"
            >
              <span className="truncate">{c.title}</span>
              <X className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
        <span>
          {grantableCount} available · {courses.length} in catalog
          {query.trim() ? ` · ${filtered.length} shown` : ''}
        </span>
        <span className="flex gap-2">
          <button
            type="button"
            className="font-medium text-[#7ec5ff] hover:text-white disabled:opacity-40"
            disabled={disabled || grantableCount === 0}
            onClick={selectAllGrantable}
          >
            Select all available
          </button>
          {selectedSlugs.size > 0 ? (
            <button
              type="button"
              className="font-medium text-white/55 hover:text-white disabled:opacity-40"
              disabled={disabled}
              onClick={clearSelection}
            >
              Clear
            </button>
          ) : null}
        </span>
      </div>

      <div
        className={cn(
          'max-h-[min(320px,45vh)] overflow-y-auto rounded-xl border border-white/[0.08] bg-black/25',
          disabled && 'pointer-events-none opacity-60',
        )}
        role="listbox"
        aria-label="Course catalog"
        aria-multiselectable="true"
      >
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-white/45">No courses match your search.</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {filtered.map((c) => {
              const enrolled = enrolledSlugs.has(c.slug);
              const checked = enrolled || selectedSlugs.has(c.slug);
              return (
                <li key={c.slug}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors',
                      enrolled ? 'cursor-not-allowed bg-white/[0.02] opacity-55' : 'hover:bg-white/[0.04]',
                      !enrolled && selectedSlugs.has(c.slug) && 'bg-[#2490ed]/10',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-[#2490ed]"
                      checked={checked}
                      disabled={enrolled || disabled}
                      onChange={() => toggle(c.slug)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug text-white/90">{c.title}</span>
                      <span className="mt-0.5 block text-xs text-white/42">
                        {c.moduleCount} modules
                        {enrolled ? ' · Already enrolled' : ''}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
