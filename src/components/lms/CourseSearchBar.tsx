'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2 } from 'lucide-react';
import { getBackendOrigin } from '@/lib/env/public-url';

interface SearchResult {
  id: string;
  slug: string;
  title: string;
  iicrc_discipline?: string | null;
  cec_hours?: string | null;
}

interface CourseSearchBarProps {
  placeholder?: string;
}

const BACKEND_URL = getBackendOrigin();

export function CourseSearchBar({
  placeholder = 'Search courses, disciplines, or topics\u2026',
}: CourseSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/lms/search?q=${encodeURIComponent(q)}&limit=8`);
      if (!res.ok) {
        setResults([]);
      } else {
        const data = await res.json();
        // Backend may return { items: [...] } or a bare array
        const items: SearchResult[] = Array.isArray(data) ? data : (data.items ?? []);
        setResults(items);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setOpen(true);
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (val.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        void search(val);
      }, 300);
    },
    [search]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setOpen(false);
  }, []);

  const handleSelect = useCallback(
    (slug: string) => {
      setOpen(false);
      setQuery('');
      router.push(`/courses/${slug}`);
    },
    [router]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input row */}
      <div
        className="flex items-center gap-2 rounded-sm border px-3 py-2.5"
        style={{
          background: '#060a14',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {loading ? (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            aria-hidden="true"
          />
        ) : (
          <Search
            className="h-4 w-4 shrink-0"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            aria-hidden="true"
          />
        )}

        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'rgba(255,255,255,0.9)' }}
          aria-label="Search courses"
          autoComplete="off"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 transition-opacity hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && query.length >= 2 && (
        <div
          className="absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded-sm shadow-lg"
          style={{
            background: '#060a14',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          role="listbox"
          aria-label="Search results"
        >
          {results.length === 0 ? (
            <div
              className="px-4 py-3 text-sm"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              role="option"
              aria-selected="false"
            >
              No courses found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul>
              {results.map((result) => (
                <li key={result.id} role="option" aria-selected="false">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        'rgba(255,255,255,0.04)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')
                    }
                    onClick={() => handleSelect(result.slug)}
                  >
                    <span
                      className="flex-1 truncate text-sm"
                      style={{ color: 'rgba(255,255,255,0.85)' }}
                    >
                      {result.title}
                    </span>

                    <div className="flex shrink-0 items-center gap-2">
                      {result.iicrc_discipline && (
                        <span
                          className="rounded-sm px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: 'rgba(36,144,237,0.15)',
                            color: '#2490ed',
                          }}
                        >
                          {result.iicrc_discipline}
                        </span>
                      )}
                      {result.cec_hours && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {result.cec_hours} CECs
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
