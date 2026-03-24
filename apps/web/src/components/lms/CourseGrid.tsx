'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import { CourseCard } from './CourseCard';
import { CourseGridSkeleton } from './CourseCardSkeleton';

const smoothEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

const DISCIPLINE_TABS = ['All', 'WRT', 'CRT', 'ASD', 'OCT', 'CCT', 'FSRT', 'AMRT', 'Free'] as const;
type DisciplineTab = (typeof DISCIPLINE_TABS)[number];

const tabColors: Record<string, string> = {
  WRT: '#2490ed',
  CRT: '#26c4a0',
  ASD: '#6c63ff',
  OCT: '#9b59b6',
  CCT: '#17b8d4',
  FSRT: '#f05a35',
  AMRT: '#27ae60',
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
  thumbnail_url?: string | null;
  updated_at?: string | null;
  instructor?: { full_name: string } | null;
}

interface CourseGridProps {
  courses: Course[];
  initialTab?: string;
  loading?: boolean;
}

type SortKey = 'title' | 'price' | 'updated';

function sortCourses(courses: Course[], sortBy: SortKey): Course[] {
  return [...courses].sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'price') {
      const pa = typeof a.price_aud === 'string' ? parseFloat(a.price_aud) : a.price_aud;
      const pb = typeof b.price_aud === 'string' ? parseFloat(b.price_aud) : b.price_aud;
      return pa - pb;
    }
    const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return db - da;
  });
}

function matchesDiscipline(course: Course, tab: DisciplineTab): boolean {
  if (tab === 'All') return true;
  if (tab === 'Free') {
    const p =
      typeof course.price_aud === 'string' ? parseFloat(course.price_aud) : course.price_aud;
    return course.is_free === true || p === 0;
  }
  const disc = course.discipline ?? course.category ?? '';
  return disc.toUpperCase().includes(tab);
}

export function CourseGrid({ courses, initialTab = 'All', loading = false }: CourseGridProps) {
  const validInitial: DisciplineTab = (DISCIPLINE_TABS as readonly string[]).includes(initialTab)
    ? (initialTab as DisciplineTab)
    : 'All';

  const [activeTab, setActiveTab] = useState<DisciplineTab>(validInitial);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('updated');

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const base = courses.filter(
      (c) =>
        matchesDiscipline(c, activeTab) &&
        (q === '' ||
          c.title.toLowerCase().includes(q) ||
          (c.short_description ?? '').toLowerCase().includes(q))
    );
    return sortCourses(base, sortBy);
  }, [courses, activeTab, searchQuery, sortBy]);

  return (
    <div>
      {/* Discipline tab bar */}
      <div
        className="scrollbar-hide mb-5 flex overflow-x-auto"
        role="tablist"
        aria-label="Filter by discipline"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        {DISCIPLINE_TABS.map((tab) => {
          const isActive = activeTab === tab;
          const accentColor = tabColors[tab] ?? '#2490ed';
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab)}
              className="relative min-h-[44px] px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              style={isActive ? { color: accentColor } : { color: 'rgba(255,255,255,0.4)' }}
            >
              {tab}
              {isActive && (
                <span
                  className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full"
                  style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Search + sort */}
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses..."
              aria-label="Search courses"
              className="w-52 rounded-lg py-2 pr-4 pl-9 text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(36,144,237,0.5)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(36,144,237,0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          <div
            className="flex items-center gap-1.5 text-sm"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>
              {filtered.length} course{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          aria-label="Sort courses by"
          className="rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <option value="updated">Recently Updated</option>
          <option value="price">Price</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <CourseGridSkeleton />
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: smoothEase, delay: i * 0.05 }}
            >
              <CourseCard course={course} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            No courses found{searchQuery ? ` for "${searchQuery}"` : ''}.
          </p>
        </div>
      )}
    </div>
  );
}
