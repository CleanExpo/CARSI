'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';

interface AnalyticsData {
  total_users: number;
  total_students: number;
  active_students_30d: number;
  total_enrollments: number;
  total_completions: number;
  completion_rate_pct: number;
  trialling: number;
  active_subscriptions: number;
  trial_to_paid_rate_pct: number;
  total_certs_issued: number;
  cec_reports_sent: number;
  top_courses: { title: string; completions: number }[];
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="mb-1 text-[11px] font-medium tracking-wide uppercase text-muted-foreground">
        {label}
      </p>
      <p className="text-3xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-xs text-muted-foreground">
          {sub}
        </p>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<AnalyticsData>('/api/lms/admin/analytics')
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Loading metrics…
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Business Analytics</h1>
        <p className="text-sm text-destructive">
          Failed to load analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Business Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time platform intelligence
        </p>
      </div>

      {/* Students */}
      <section>
        <h2 className="mb-4 text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Students
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total Users" value={data.total_users.toLocaleString()} />
          <MetricCard label="Students" value={data.total_students.toLocaleString()} />
          <MetricCard
            label="Active (30 days)"
            value={data.active_students_30d.toLocaleString()}
            sub="unique enrollments"
          />
          <MetricCard
            label="Completion Rate"
            value={`${data.completion_rate_pct}%`}
            sub={`${data.total_completions} of ${data.total_enrollments}`}
          />
        </div>
      </section>

      {/* Subscriptions */}
      <section>
        <h2 className="mb-4 text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Subscriptions
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Trialling"
            value={data.trialling.toLocaleString()}
            sub="free trial active"
          />
          <MetricCard
            label="Paid Active"
            value={data.active_subscriptions.toLocaleString()}
            sub="Foundation + Growth"
          />
          <MetricCard
            label="Trial → Paid"
            value={`${data.trial_to_paid_rate_pct}%`}
            sub="conversion rate"
          />
        </div>
      </section>

      {/* Certifications */}
      <section>
        <h2 className="mb-4 text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Certifications
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard
            label="Certificates Issued"
            value={data.total_certs_issued.toLocaleString()}
          />
          <MetricCard
            label="IICRC CEC Reports Sent"
            value={data.cec_reports_sent.toLocaleString()}
          />
        </div>
      </section>

      {/* Top Courses */}
      {data.top_courses.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Top Courses by Completion
          </h2>
          <div className="overflow-hidden rounded-lg border border-border">
            {data.top_courses.map((course, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-5 py-3 ${i % 2 === 0 ? 'bg-secondary' : ''} ${i < data.top_courses.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="min-w-4 font-mono text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground">
                    {course.title}
                  </span>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {course.completions} completions
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
