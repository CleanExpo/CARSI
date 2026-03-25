import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Metrics {
  total_users: number;
  total_courses: number;
  total_enrollments: number;
}

interface AdminMetricsProps {
  metrics: Metrics;
}

export function AdminMetrics({ metrics }: AdminMetricsProps) {
  const stats = [
    { label: 'Total Users', value: metrics.total_users },
    { label: 'Total Courses', value: metrics.total_courses },
    { label: 'Total Enrolments', value: metrics.total_enrollments },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
