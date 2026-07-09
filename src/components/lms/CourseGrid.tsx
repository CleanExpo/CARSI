'use client';

import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useTheme } from '@/components/ThemeProvider';
import { isOnboardingCourse } from '@/lib/onboarding/enterprise';
import { CourseCard } from './CourseCard';
import { CourseGridSkeleton } from './CourseCardSkeleton';

const smoothEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

// Topic tabs (de-IICRC 2026-07-10): CARSI does not brand courses with IICRC
// discipline acronyms, so the catalogue filters by plain restoration topic
// (matched against course title/category), not by WRT/ASD/etc.
const DISCIPLINE_TABS = ['All', 'Onboarding', 'Water Damage', 'Mould', 'Fire & Smoke', 'Cleaning', 'Free'] as const;
type DisciplineTab = (typeof DISCIPLINE_TABS)[number];
type PriceFilter = 'all' | 'free' | 'paid';
type CecFilter = 'all' | 'has-cec';
type DurationFilter = 'all' | 'short' | 'medium' | 'long';

// Bright accents — used on dark surfaces only (active-tab text sits on a ~9% tint of itself).
const tabColors: Record<string, string> = {
  Onboarding: '#ed9d24',
  'Water Damage': '#0f5fa8',
  Mould: '#27ae60',
  'Fire & Smoke': '#f05a35',
  Cleaning: '#17b8d4',
};

// WCAG AA light-mode accents — darkened so active-tab text clears 4.5:1 on its pale tint over white.
const tabColorsLight: Record<string, string> = {
  Onboarding: '#a85500',
  'Water Damage': '#0f5fa8',
  Mould: '#157a55',
  'Fire & Smoke': '#c2410c',
  Cleaning: '#0e7490',
};

interface Course {
  id: string;
  slug: string;
  title: string;
  short_description?: string | null;
  price_aud: number | string;
  is_free?: boolean;
  level?: string | null;
  category?: string | null;
  discipline?: string | null;
  lesson_count?: number | null;
  module_count?: number | null;
  catalog_status?: string | null;
  thumbnail_url?: string | null;
  updated_at?: string | null;
  instructor?: { full_name: string } | null;
  cec_hours?: string | null;
  duration_hours?: string | null;
  tags?: string[] | null;
}

interface CourseGridProps {
  courses: Course[];
  initialTab?: string;
  loading?: boolean;
  /** When true, adds “Most modules” sort (dashboard DB catalogue). */
  showModulesSort?: boolean;
  /** Default sort column (e.g. `modules` when viewing drafts). */
  initialSortBy?: 'title' | 'price' | 'updated' | 'modules';
  /** Light, dark, or follow global theme (default). */
  surface?: 'light' | 'dark' | 'auto';
}

type SortKey = 'title' | 'price' | 'updated' | 'modules';

function priceNum(p: number | string): number {
  const n = typeof p === 'string' ? parseFloat(p) : p;
  return Number.isFinite(n) ? n : 0;
}

function sortCourses(courses: Course[], sortBy: SortKey): Course[] {
  return [...courses].sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'price') {
      return priceNum(a.price_aud) - priceNum(b.price_aud);
    }
    if (sortBy === 'modules') {
      const ma = a.module_count ?? 0;
      const mb = b.module_count ?? 0;
      return mb - ma;
    }
    const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return db - da;
  });
}

function matchesDiscipline(course: Course, tab: DisciplineTab): boolean {
  if (tab === 'All') return true;
  if (tab === 'Onboarding') {
    return isOnboardingCourse({ slug: course.slug, category: course.category });
  }
  if (tab === 'Free') {
    const p = priceNum(course.price_aud);
    return course.is_free === true || p === 0;
  }
  // Match the topic tab against the course's category AND title (WP-era courses
  // often have a null category, so title is needed). `discipline` is retained for
  // any legacy rows but is null across the CARSI catalogue post-de-IICRC.
  const hay = [course.discipline, course.category, course.title]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
  return hay.includes(tab.toUpperCase());
}

function normalizedLevel(course: Course): string {
  return course.level?.trim().toLowerCase() || 'all levels';
}

function matchesTag(course: Course, tag: string): boolean {
  if (tag === 'all') return true;
  return (course.tags ?? []).some((t) => t.toLowerCase() === tag.toLowerCase());
}

function courseDurationHours(course: Course): number | null {
  const raw = course.duration_hours;
  if (!raw) return null;
  const n = Number.parseFloat(String(raw));
  return Number.isFinite(n) ? n : null;
}

function matchesDuration(course: Course, filter: DurationFilter): boolean {
  if (filter === 'all') return true;
  const hours = courseDurationHours(course);
  if (hours == null) return false;
  if (filter === 'short') return hours <= 1;
  if (filter === 'medium') return hours > 1 && hours <= 3;
  return hours > 3;
}

export function CourseGrid({
  courses,
  initialTab = 'All',
  loading = false,
  showModulesSort = false,
  initialSortBy,
  surface = 'auto',
}: CourseGridProps) {
  const { theme } = useTheme();
  const isDark = surface === 'auto' ? theme === 'dark' : surface === 'dark';
  const controlClass = isDark
    ? 'h-11 rounded-xl border border-white/10 bg-[#080c14]/80 px-3 text-sm text-white outline-none focus:border-[#2490ed]/50 focus:ring-1 focus:ring-[#2490ed]/25'
    : 'h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-[#2490ed] focus:ring-2 focus:ring-[#2490ed]/20 focus:outline-none';
  const validInitial: DisciplineTab = (DISCIPLINE_TABS as readonly string[]).includes(initialTab)
    ? (initialTab as DisciplineTab)
    : 'All';

  const [activeTab, setActiveTab] = useState<DisciplineTab>(validInitial);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [cecFilter, setCecFilter] = useState<CecFilter>('all');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>(() => {
    if (initialSortBy === 'modules') return showModulesSort ? 'modules' : 'updated';
    if (initialSortBy === 'price') return 'price';
    if (initialSortBy === 'updated') return 'updated';
    if (initialSortBy === 'title') return 'title';
    return 'updated';
  });
  const didFallbackTab = useRef(false);

  // URL ?discipline=WRT with sparse `discipline` fields used to yield zero rows; reset to All once.
  useEffect(() => {
    if (didFallbackTab.current || loading || courses.length === 0) return;
    if (validInitial === 'All') return;
    const n = courses.filter((c) => matchesDiscipline(c, validInitial)).length;
    if (n === 0) {
      didFallbackTab.current = true;
      // One-time correction once data loads, guarded by the ref above.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('All');
    }
  }, [courses, loading, validInitial]);

  const levelOptions = useMemo(() => {
    const levels = new Set<string>();
    for (const course of courses) {
      const level = normalizedLevel(course);
      if (level !== 'all levels') levels.add(level);
    }
    return [...levels].sort((a, b) => a.localeCompare(b));
  }, [courses]);

  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    for (const course of courses) {
      for (const tag of course.tags ?? []) {
        const trimmed = tag.trim();
        if (trimmed) tags.add(trimmed);
      }
    }
    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [courses]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const base = courses.filter(
      (c) => {
        const p = priceNum(c.price_aud);
        const priceMatches =
          priceFilter === 'all' ||
          (priceFilter === 'free' ? c.is_free === true || p === 0 : p > 0);
        const levelMatches = levelFilter === 'all' || normalizedLevel(c) === levelFilter;
        const cecMatches = cecFilter === 'all' || Boolean(c.cec_hours?.trim());

        return (
          matchesDiscipline(c, activeTab) &&
          priceMatches &&
          levelMatches &&
          cecMatches &&
          matchesDuration(c, durationFilter) &&
          matchesTag(c, tagFilter) &&
        (q === '' ||
          c.title.toLowerCase().includes(q) ||
          (c.short_description ?? '').toLowerCase().includes(q) ||
          (c.category ?? '').toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          (c.tags ?? []).some((t) => t.toLowerCase().includes(q)))
        );
      }
    );
    return sortCourses(base, sortBy);
  }, [
    courses,
    activeTab,
    searchQuery,
    sortBy,
    levelFilter,
    priceFilter,
    cecFilter,
    durationFilter,
    tagFilter,
  ]);

  return (
    <div>
      {/* Discipline tab bar */}
      <div
        className={
          isDark
            ? 'scrollbar-hide mb-5 flex gap-2 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.04] p-1'
            : 'scrollbar-hide mb-5 flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1'
        }
        role="tablist"
        aria-label="Filter by topic"
      >
        {DISCIPLINE_TABS.map((tab) => {
          const isActive = activeTab === tab;
          const accentColor =
            (isDark ? tabColors[tab] : (tabColorsLight[tab] ?? tabColors[tab])) ?? '#0f5fa8';
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab)}
              className="relative min-h-[44px] rounded-md px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2490ed]/40"
              style={
                isActive
                  ? { color: accentColor, background: `${accentColor}18` }
                  : { color: isDark ? 'rgba(255,255,255,0.55)' : '#475569' }
              }
            >
              {tab}
              {isActive && (
                <span
                  className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full"
                  style={{ background: accentColor }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Search + sort */}
      <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-end">
        <div
          className={
            tagOptions.length > 0
              ? 'grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.3fr)_repeat(5,minmax(130px,0.8fr))]'
              : 'grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.3fr)_repeat(4,minmax(130px,0.8fr))]'
          }
        >
          <div className="relative">
            <Search
              className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#64748b' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses..."
              aria-label="Search courses"
              className={
                isDark
                  ? 'h-11 w-full rounded-xl border border-white/10 bg-[#080c14]/80 py-2 pr-4 pl-9 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#2490ed]/50 focus:ring-1 focus:ring-[#2490ed]/25'
                  : 'h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pr-4 pl-9 text-sm text-slate-900 shadow-sm transition focus:border-[#2490ed] focus:ring-2 focus:ring-[#2490ed]/20 focus:outline-none'
              }
            />
          </div>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            aria-label="Filter by level"
            className={controlClass}
          >
            <option value="all">All levels</option>
            {levelOptions.map((level) => (
              <option key={level} value={level}>
                {level[0]?.toUpperCase()}
                {level.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
            aria-label="Filter by price"
            className={controlClass}
          >
            <option value="all">All pricing</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>

          <select
            value={cecFilter}
            onChange={(e) => setCecFilter(e.target.value as CecFilter)}
            aria-label="Filter by CEC availability"
            className={controlClass}
          >
            <option value="all">All CECs</option>
            <option value="has-cec">CEC eligible</option>
          </select>

          <select
            value={durationFilter}
            onChange={(e) => setDurationFilter(e.target.value as DurationFilter)}
            aria-label="Filter by duration"
            className={controlClass}
          >
            <option value="all">Any duration</option>
            <option value="short">1h or less</option>
            <option value="medium">1-3h</option>
            <option value="long">3h+</option>
          </select>

          {tagOptions.length > 0 ? (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              aria-label="Filter by tag"
              className={controlClass}
            >
              <option value="all">All tags</option>
              {tagOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
          <div
            className={`flex items-center gap-1.5 text-sm font-medium whitespace-nowrap ${
              isDark ? 'text-white/55' : 'text-slate-600'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>
              {filtered.length} course{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            aria-label="Sort courses by"
            className={`h-11 w-full px-3 text-sm outline-none sm:w-auto ${
              isDark
                ? 'rounded-xl border border-white/10 bg-[#080c14]/80 text-white focus:border-[#2490ed]/50 focus:ring-1 focus:ring-[#2490ed]/25'
                : 'rounded-lg border border-slate-300 bg-white text-slate-800 shadow-sm focus:border-[#2490ed] focus:ring-2 focus:ring-[#2490ed]/20'
            }`}
          >
            <option value="updated">Recently updated</option>
            {showModulesSort ? <option value="modules">Most modules</option> : null}
            <option value="price">Price low-high</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <CourseGridSkeleton />
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: smoothEase, delay: i * 0.05 }}
            >
              <CourseCard course={course} priorityImage={i < 9} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className={`text-sm ${isDark ? 'text-white/55' : 'text-slate-600'}`}>
            No courses found{searchQuery ? ` for "${searchQuery}"` : ''}.
          </p>
        </div>
      )}
    </div>
  );
}
