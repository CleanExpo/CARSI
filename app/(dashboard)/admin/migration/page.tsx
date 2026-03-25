'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

interface MigrationJob {
  id: string;
  job_type: string;
  status: string;
  total_items: number | null;
  processed_items: number;
  failed_items: number;
  result_manifest: Record<string, unknown>[];
  error_log: Record<string, unknown>[];
  created_at: string;
}

const STATUS_COLOURS: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-400',
  running: 'bg-amber-500/10 text-amber-400',
  pending: 'bg-blue-500/10 text-blue-400',
  failed: 'bg-red-500/10 text-red-400',
};

export default function MigrationPage() {
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedJob, setSelectedJob] = useState<MigrationJob | null>(null);

  async function fetchJobs() {
    try {
      const data = await apiClient.get<{ items: MigrationJob[] }>('/api/lms/admin/migration/jobs');
      setJobs(data.items ?? []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }

  async function startDiscovery() {
    setRunning(true);
    try {
      await apiClient.post('/api/lms/admin/migration/discover', { dry_run: false });
      await fetchJobs();
    } finally {
      setRunning(false);
    }
  }

  async function loadJob(jobId: string) {
    setRunning(true);
    try {
      await apiClient.post('/api/lms/admin/migration/load', { job_id: jobId });
      await fetchJobs();
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Migration</h1>
          <p className="text-muted-foreground text-sm">
            Scan Google Drive and import courses into the database.
          </p>
        </div>
        <Button onClick={startDiscovery} disabled={running}>
          {running ? 'Running…' : 'Run Discovery Scan'}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading jobs…</p>
      ) : jobs.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No migration jobs yet. Run a discovery scan to start.
        </p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className="cursor-pointer"
              onClick={() => setSelectedJob(job === selectedJob ? null : job)}
            >
              <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">{job.job_type}</span>
                  <span
                    className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${STATUS_COLOURS[job.status] ?? ''}`}
                  >
                    {job.status}
                  </span>
                </div>
                <div className="text-muted-foreground flex gap-4 text-xs">
                  <span>
                    {job.processed_items}/{job.total_items ?? '?'} processed
                  </span>
                  {job.failed_items > 0 && (
                    <span className="text-red-400">{job.failed_items} failed</span>
                  )}
                  <span>{new Date(job.created_at).toLocaleString('en-AU')}</span>
                </div>
              </CardHeader>

              {selectedJob?.id === job.id && (
                <CardContent className="border-t p-4">
                  {job.job_type === 'discover' && job.status === 'completed' && (
                    <Button
                      size="sm"
                      className="mb-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadJob(job.id);
                      }}
                      disabled={running}
                    >
                      Load All into Database
                    </Button>
                  )}

                  {job.result_manifest.length > 0 && (
                    <div className="max-h-64 overflow-y-auto">
                      <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                        Discovered Items ({job.result_manifest.length})
                      </p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b">
                            <th className="py-1 text-left">Name</th>
                            <th className="py-1 text-left">Slug</th>
                            <th className="py-1 text-left">Discipline</th>
                            <th className="py-1 text-left">CECs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {job.result_manifest.map((item, i) => (
                            <tr key={i} className="border-b border-white/5">
                              <td className="py-1 pr-3">{String(item.drive_name ?? '')}</td>
                              <td className="py-1 pr-3 font-mono">
                                {String(item.proposed_slug ?? '')}
                              </td>
                              <td className="py-1 pr-3">{String(item.iicrc_discipline ?? '—')}</td>
                              <td className="py-1">{String(item.cec_hours ?? '—')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {job.error_log.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-muted-foreground cursor-pointer text-xs">
                        {job.error_log.length} error{job.error_log.length !== 1 ? 's' : ''}
                      </summary>
                      <pre className="bg-muted mt-2 max-h-40 overflow-auto rounded-sm p-3 text-xs">
                        {JSON.stringify(job.error_log, null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
