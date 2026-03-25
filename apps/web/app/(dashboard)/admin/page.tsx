'use client';

import { useEffect, useState } from 'react';
import { AdminMetrics } from '@/components/lms/AdminMetrics';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';

interface Metrics {
  total_users: number;
  total_courses: number;
  total_enrollments: number;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<Metrics>('/api/lms/admin/metrics')
      .then((data) => setMetrics(data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management tools.</p>
      </div>

      {loading && <p className="text-muted-foreground">Loading metrics…</p>}
      {metrics && <AdminMetrics metrics={metrics} />}

      <div className="flex flex-wrap gap-4">
        <Button asChild variant="outline">
          <Link href="/admin/users">Manage Users</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/courses">Review Courses</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/analytics">Analytics</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/revenue">Revenue</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/audit">Audit Log</Link>
        </Button>
      </div>
    </div>
  );
}
