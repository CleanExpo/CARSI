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
      className="flex min-w-[260px] flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <div
        className="h-32 w-full animate-pulse rounded-sm bg-secondary"
      />
      <div
        className="h-3 w-20 animate-pulse rounded-sm bg-primary/20"
      />
      <div
        className="h-4 w-3/4 animate-pulse rounded-sm bg-secondary"
      />
      <div
        className="h-3 w-full animate-pulse rounded-sm bg-secondary"
      />
      <div
        className="h-3 w-2/3 animate-pulse rounded-sm bg-secondary"
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
      className="flex max-w-[300px] min-w-[260px] flex-shrink-0 flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:scale-[1.01]"
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
          className="flex h-32 w-full items-center justify-center rounded-sm bg-primary/5"
        >
          <span className="font-mono text-xs text-primary/40">
            {course.iicrc_discipline ?? 'CARSI'}
          </span>
        </div>
      )}

      {/* Discipline badge + CEC hours */}
      <div className="flex items-center gap-2">
        {course.iicrc_discipline && (
          <span
            className="rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-primary uppercase"
          >
            {course.iicrc_discipline}
          </span>
        )}
        {course.cec_hours !== null && (
          <span className="font-mono text-[10px] text-muted-foreground/60">
            {course.cec_hours} CEC hrs
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-foreground">{course.title}</h3>

      {/* Reason */}
      <p className="line-clamp-1 text-xs italic text-muted-foreground/60">
        {course.reason}
      </p>

      {/* Enrol button */}
      <Link
        href={`/courses/${course.slug}`}
        className="mt-auto inline-flex items-center justify-center rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-white transition-all hover:brightness-110"
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
        className="rounded-sm border border-primary/10 bg-primary/5 p-6 text-center"
      >
        <p className="text-sm text-muted-foreground">
          Complete a course to unlock personalised recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="text-xs text-destructive">
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
