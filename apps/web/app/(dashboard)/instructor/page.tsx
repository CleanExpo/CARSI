'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, BarChart3, Sparkles, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';

interface InstructorMetrics {
  total_courses: number;
  total_enrollments: number;
  published_courses: number;
}

const NAV_ITEMS = [
  {
    href: '/instructor/courses/new',
    icon: BookOpen,
    label: 'Create Course',
    description: 'Build a new course with modules and lessons',
  },
  {
    href: '/instructor/analytics',
    icon: BarChart3,
    label: 'Analytics',
    description: 'Enrolment stats and student progress',
  },
  {
    href: '/instructor/ai-builder',
    icon: Sparkles,
    label: 'AI Course Builder',
    description: 'Generate course content with AI assistance',
  },
  {
    href: '/instructor/ideas',
    icon: Lightbulb,
    label: 'Course Ideas',
    description: 'Browse and develop course concepts',
  },
];

export default function InstructorDashboardPage() {
  const [metrics, setMetrics] = useState<InstructorMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<InstructorMetrics>('/api/lms/instructor/analytics/summary')
      .then((data) => setMetrics(data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="flex max-w-4xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-bold text-white">Instructor Dashboard</h1>
        <p className="text-sm text-white/40">Manage your courses and track student progress.</p>
      </div>

      {/* Metrics summary */}
      {loading && <p className="text-sm text-white/30">Loading metrics...</p>}
      {metrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-sm border border-white/[0.06] bg-zinc-900/50 p-4">
            <p className="font-mono text-xs tracking-widest text-white/40 uppercase">
              Published Courses
            </p>
            <p className="mt-1 font-mono text-2xl text-white">{metrics.published_courses}</p>
          </div>
          <div className="rounded-sm border border-white/[0.06] bg-zinc-900/50 p-4">
            <p className="font-mono text-xs tracking-widest text-white/40 uppercase">
              Total Courses
            </p>
            <p className="mt-1 font-mono text-2xl text-white">{metrics.total_courses}</p>
          </div>
          <div className="rounded-sm border border-white/[0.06] bg-zinc-900/50 p-4">
            <p className="font-mono text-xs tracking-widest text-white/40 uppercase">
              Total Enrolments
            </p>
            <p className="mt-1 font-mono text-2xl text-white">{metrics.total_enrollments}</p>
          </div>
        </div>
      )}

      {/* Navigation grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start gap-4 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-5 transition-colors hover:border-white/20 hover:bg-zinc-900/80"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10"
            >
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-white group-hover:text-white/90">
                {item.label}
              </span>
              <span className="text-xs text-white/40">{item.description}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" className="rounded-sm border-white/10 text-white/60">
          <Link href="/instructor/courses/new">New Course</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-sm border-white/10 text-white/60">
          <Link href="/instructor/analytics">View Analytics</Link>
        </Button>
      </div>
    </main>
  );
}
