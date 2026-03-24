'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';

interface RecommendedCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  iicrc_discipline: string | null;
  cec_hours: number | null;
  thumbnail_url: string | null;
  reason: string;
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div
      className="flex min-w-[260px] flex-col gap-3 rounded-sm p-4"
      style={{ background: '#060a14', border: '0.5px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="h-32 w-full animate-pulse rounded-sm"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      />
      <div
        className="h-3 w-20 animate-pulse rounded-sm"
        style={{ background: 'rgba(36,144,237,0.2)' }}
      />
      <div
        className="h-4 w-3/4 animate-pulse rounded-sm"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      />
      <div
        className="h-3 w-full animate-pulse rounded-sm"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      />
      <div
        className="h-3 w-2/3 animate-pulse rounded-sm"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single recommendation card
// ---------------------------------------------------------------------------

function RecommendationCard({ course }: { course: RecommendedCourse }) {
  return (
    <div
      className="flex max-w-[300px] min-w-[260px] flex-shrink-0 flex-col gap-3 rounded-sm p-4 transition-all hover:scale-[1.01]"
      style={{
        background: '#060a14',
        border: '0.5px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Thumbnail */}
      {course.thumbnail_url ? (
        <img
          src={course.thumbnail_url}
          alt={course.title}
          className="h-32 w-full rounded-sm object-cover"
        />
      ) : (
        <div
          className="flex h-32 w-full items-center justify-center rounded-sm"
          style={{ background: 'rgba(36,144,237,0.06)' }}
        >
          <span className="font-mono text-xs" style={{ color: 'rgba(36,144,237,0.4)' }}>
            {course.iicrc_discipline ?? 'CARSI'}
          </span>
        </div>
      )}

      {/* Discipline badge + CEC hours */}
      <div className="flex items-center gap-2">
        {course.iicrc_discipline && (
          <span
            className="rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase"
            style={{ background: 'rgba(36,144,237,0.15)', color: '#2490ed' }}
          >
            {course.iicrc_discipline}
          </span>
        )}
        {course.cec_hours !== null && (
          <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {course.cec_hours} CEC hrs
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-white">{course.title}</h3>

      {/* Reason */}
      <p className="line-clamp-1 text-xs italic" style={{ color: 'rgba(255,255,255,0.40)' }}>
        {course.reason}
      </p>

      {/* Enrol button */}
      <Link
        href={`/courses/${course.slug}`}
        className="mt-auto inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-xs font-medium text-white transition-all hover:brightness-110"
        style={{ background: '#2490ed' }}
      >
        Enrol now
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

export function RecommendationWidget() {
  const [courses, setCourses] = useState<RecommendedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<RecommendedCourse[]>('/api/lms/recommendations/next-course');
      setCourses(data);
    } catch {
      setError('Could not load recommendations right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Empty state — student hasn't completed any courses yet
  if (!loading && courses.length === 0 && !error) {
    return (
      <div
        className="rounded-sm p-6 text-center"
        style={{
          background: 'rgba(36,144,237,0.04)',
          border: '0.5px solid rgba(36,144,237,0.12)',
        }}
      >
        <p className="text-sm text-white/50">
          Complete a course to unlock personalised recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="text-xs" style={{ color: 'rgba(255,68,68,0.8)' }}>
          {error}
        </p>
      )}

      {/* Horizontal scroll container */}
      <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          courses
            .slice(0, 3)
            .map((course) => <RecommendationCard key={course.id} course={course} />)
        )}
      </div>
    </div>
  );
}
