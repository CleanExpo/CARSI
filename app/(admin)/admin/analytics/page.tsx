import { AdminCohortAnalytics } from '@/components/admin/AdminCohortAnalytics';
import { AdminCrmEvents } from '@/components/admin/AdminCrmEvents';

export const metadata = {
  title: 'Analytics | Admin | CARSI',
};

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-white">Analytics & CRM</h1>
        <p className="mt-1 text-sm text-white/50">
          Cohort completion for B2B customers and outbound CRM webhook activity.
        </p>
      </header>

      <AdminCohortAnalytics />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">CRM sync log</h2>
        <AdminCrmEvents />
      </section>
    </div>
  );
}
