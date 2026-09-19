'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  ADMIN_PAGE_SIZE_PRESETS,
  isAdminPageSizePreset,
  parseAdminPageSizeChoice,
  type AdminPageSizeChoice,
  getAdminPageItems,
} from '@/lib/admin/admin-pagination';
import { cn } from '@/lib/utils';

const controlClass =
  'inline-flex h-10 min-w-10 items-center justify-center rounded-lg border text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080b14]';

const fieldClass =
  'h-10 rounded-lg border border-white/12 bg-black/30 px-2.5 text-xs font-medium text-white/85 outline-none transition-colors duration-150 hover:border-white/20 focus-visible:border-[#2490ed]/50 focus-visible:ring-2 focus-visible:ring-[#2490ed]/45';

function RowsPerPage({
  pageSize,
  onPageSizeChange,
}: {
  pageSize: AdminPageSizeChoice;
  onPageSizeChange: (size: AdminPageSizeChoice) => void;
}) {
  const usingCustom = pageSize !== 'all' && !isAdminPageSizePreset(pageSize);
  const [draft, setDraft] = useState(usingCustom ? String(pageSize) : '');

  useEffect(() => {
    setDraft(pageSize !== 'all' && !isAdminPageSizePreset(pageSize) ? String(pageSize) : '');
  }, [pageSize]);

  const selectValue = pageSize === 'all' ? 'all' : isAdminPageSizePreset(pageSize) ? String(pageSize) : 'custom';

  function commitCustom(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const next = parseAdminPageSizeChoice(trimmed);
    if (next === 'all') {
      onPageSizeChange('all');
      return;
    }
    onPageSizeChange(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-2 text-xs text-white/45">
        <span className="whitespace-nowrap">Rows per page</span>
        <select
          value={selectValue}
          aria-label="Rows per page"
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'all') {
              onPageSizeChange('all');
              return;
            }
            if (value === 'custom') {
              onPageSizeChange(pageSize === 'all' || isAdminPageSizePreset(pageSize) ? 12 : pageSize);
              return;
            }
            onPageSizeChange(parseAdminPageSizeChoice(value));
          }}
          className={fieldClass}
        >
          {ADMIN_PAGE_SIZE_PRESETS.map((size) => (
            <option key={size} value={size} className="bg-[#0c101c]">
              {size}
            </option>
          ))}
          <option value="all" className="bg-[#0c101c]">
            All
          </option>
          <option value="custom" className="bg-[#0c101c]">
            Custom
          </option>
        </select>
      </label>
      {selectValue === 'custom' ? (
        <input
          type="number"
          min={1}
          max={10000}
          inputMode="numeric"
          aria-label="Custom rows per page"
          placeholder="e.g. 14"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value.trim()) commitCustom(e.target.value);
          }}
          onBlur={(e) => commitCustom(e.target.value)}
          className={cn(fieldClass, 'w-20 tabular-nums')}
        />
      ) : null}
    </div>
  );
}

export function AdminPagination({
  page,
  pageCount,
  onPageChange,
  className,
  pageSize,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
  pageSize?: AdminPageSizeChoice;
  onPageSizeChange?: (size: AdminPageSizeChoice) => void;
}) {
  if (pageCount < 1) return null;

  const items = getAdminPageItems(page, pageCount);
  const atStart = page <= 1;
  const atEnd = page >= pageCount;
  const showSize = pageSize !== undefined && onPageSizeChange !== undefined;

  return (
    <div className={cn('flex w-full flex-wrap items-center justify-between gap-3', className)}>
      {showSize ? <RowsPerPage pageSize={pageSize} onPageSizeChange={onPageSizeChange} /> : <span />}

      <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
        <button
          type="button"
          disabled={atStart}
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
          className={cn(
            controlClass,
            atStart
              ? 'cursor-not-allowed border-white/[0.06] text-white/20'
              : 'border-white/12 text-white/75 hover:border-white/20 hover:bg-white/[0.06] hover:text-white active:bg-white/[0.09]'
          )}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>

        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex h-10 min-w-8 items-center justify-center px-1 text-sm text-white/30 select-none"
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
              className={cn(
                controlClass,
                'min-w-10 px-2.5 tabular-nums',
                item === page
                  ? 'border-[#2490ed]/60 bg-[#2490ed] font-semibold text-white shadow-[0_0_0_1px_rgba(36,144,237,0.35)]'
                  : 'border-white/12 text-white/70 hover:border-white/20 hover:bg-white/[0.06] hover:text-white active:bg-white/[0.09]'
              )}
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
          className={cn(
            controlClass,
            atEnd
              ? 'cursor-not-allowed border-white/[0.06] text-white/20'
              : 'border-white/12 text-white/75 hover:border-white/20 hover:bg-white/[0.06] hover:text-white active:bg-white/[0.09]'
          )}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </nav>
    </div>
  );
}
