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
    <div
      className="rounded-sm p-5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p
        className="mb-1 text-[11px] font-medium tracking-wide uppercase"
        style={{ color: 'rgba(255,255,255,0.35)' }}
      >
        {label}
      </p>
      <p className="text-3xl font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.92)' }}>
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
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
          <p style={{ color: 'rgba(255,255,255,0.4)' }} className="mt-1 text-sm">
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
        <p style={{ color: '#ff6b6b' }} className="text-sm">
          Failed to load analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Business Analytics</h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Real-time platform intelligence
        </p>
      </div>

      {/* Students */}
      <section>
        <h2
          className="mb-4 text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
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
        <h2
          className="mb-4 text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
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
        <h2
          className="mb-4 text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
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
          <h2
            className="mb-4 text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            Top Courses by Completion
          </h2>
          <div
            className="overflow-hidden rounded-sm"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {data.top_courses.map((course, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3"
                style={{
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderBottom:
                    i < data.top_courses.length - 1
                      ? '1px solid rgba(255,255,255,0.05)'
                      : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono text-xs"
                    style={{ color: 'rgba(255,255,255,0.25)', minWidth: '16px' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {course.title}
                  </span>
                </div>
                <span className="text-sm font-semibold" style={{ color: '#2490ed' }}>
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
