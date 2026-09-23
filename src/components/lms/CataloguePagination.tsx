'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  CATALOGUE_PAGE_SIZE_DEFAULT,
  CATALOGUE_PAGE_SIZE_PRESETS,
  formatCatalogueResultRange,
  getCataloguePageItems,
  isCataloguePageSizePreset,
  parseCataloguePageSizeChoice,
  type CataloguePageSizeChoice,
} from '@/lib/catalogue-pagination';

type CataloguePaginationProps = {
  page: number;
  pageCount: number;
  pageSize: CataloguePageSizeChoice;
  start: number;
  end: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: CataloguePageSizeChoice) => void;
  /** Dark matches the learner Home / dashboard catalogue surface. */
  tone?: 'light' | 'dark';
};

function currentNumericSize(pageSize: CataloguePageSizeChoice): number {
  return pageSize === 'all' ? CATALOGUE_PAGE_SIZE_DEFAULT : pageSize;
}

function RowsPerPage({
  pageSize,
  onPageSizeChange,
  tone = 'light',
}: {
  pageSize: CataloguePageSizeChoice;
  onPageSizeChange: (size: CataloguePageSizeChoice) => void;
  tone?: 'light' | 'dark';
}) {
  const inferredCustom = pageSize !== 'all' && !isCataloguePageSizePreset(pageSize);
  const [customOpen, setCustomOpen] = useState(inferredCustom);
  const [draft, setDraft] = useState(() =>
    inferredCustom ? String(pageSize) : String(currentNumericSize(pageSize))
  );

  useEffect(() => {
    if (pageSize === 'all') {
      setCustomOpen(false);
      return;
    }
    if (isCataloguePageSizePreset(pageSize) && !customOpen) {
      setDraft(String(pageSize));
    }
    if (inferredCustom) {
      setCustomOpen(true);
      setDraft(String(pageSize));
    }
  }, [pageSize, inferredCustom, customOpen]);

  const selectValue = customOpen ? 'custom' : pageSize === 'all' ? 'all' : String(pageSize);

  function commitCustom(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const next = parseCataloguePageSizeChoice(trimmed);
    if (next === 'all') {
      setCustomOpen(false);
      onPageSizeChange('all');
      return;
    }
    onPageSizeChange(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-2">
        <span className="whitespace-nowrap">
          {tone === 'dark' ? 'Courses per page' : 'Rows per page'}
        </span>
        <select
          value={selectValue}
          aria-label={tone === 'dark' ? 'Courses per page' : 'Rows per page'}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'all') {
              setCustomOpen(false);
              onPageSizeChange('all');
              return;
            }
            if (value === 'custom') {
              setCustomOpen(true);
              setDraft(String(currentNumericSize(pageSize)));
              return;
            }
            setCustomOpen(false);
            onPageSizeChange(parseCataloguePageSizeChoice(value));
          }}
          className="h-10 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 shadow-sm focus-visible:ring-2 focus-visible:ring-[#146fc2]/45 focus-visible:outline-none"
        >
          {CATALOGUE_PAGE_SIZE_PRESETS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
          <option value="all">All</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      {customOpen ? (
        <input
          type="number"
          min={1}
          max={10000}
          inputMode="numeric"
          aria-label="Custom number of courses per page"
          placeholder="e.g. 8"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commitCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitCustom((e.target as HTMLInputElement).value);
            }
          }}
          className="h-10 w-20 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-900 tabular-nums shadow-sm focus-visible:ring-2 focus-visible:ring-[#146fc2]/45 focus-visible:outline-none"
        />
      ) : null}
    </div>
  );
}

export function CataloguePagination({
  page,
  pageCount,
  pageSize,
  start,
  end,
  total,
  onPageChange,
  onPageSizeChange,
  tone = 'light',
}: CataloguePaginationProps) {
  if (total === 0) return null;

  const items = getCataloguePageItems(page, pageCount);
  const atStart = page <= 1;
  const atEnd = page >= pageCount;
  const compactBtn =
    'inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146fc2]/45';

  return (
    <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <nav
        className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-slate-200 bg-slate-50 px-1.5 py-1"
        aria-label="Course catalogue pagination"
      >
        <button
          type="button"
          disabled={atStart}
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
          className={`${compactBtn} ${
            atStart ? 'cursor-not-allowed text-slate-300' : 'text-slate-800 hover:bg-white'
          }`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>

        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="hidden h-10 min-w-6 items-center justify-center px-1 text-sm text-slate-500 select-none sm:inline-flex"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={`${compactBtn} tabular-nums ${
                item === page
                  ? 'bg-[#146fc2] text-white shadow-sm'
                  : 'hidden text-slate-800 hover:bg-white sm:inline-flex'
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          disabled={atEnd}
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
          className={`${compactBtn} ${
            atEnd ? 'cursor-not-allowed text-slate-300' : 'text-slate-800 hover:bg-white'
          }`}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </nav>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-800">
        <p aria-live="polite">
          {`${formatCatalogueResultRange(start, end, total)} · Page ${page} of ${pageCount}`}
        </p>
        <RowsPerPage pageSize={pageSize} onPageSizeChange={onPageSizeChange} tone={tone} />
      </div>
    </div>
  );
}
