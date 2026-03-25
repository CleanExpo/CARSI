'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Award } from 'lucide-react';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { LinkedInShareButton } from '@/components/lms/LinkedInShareButton';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api/client';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

interface CredentialOut {
  credential_id: string;
  course_title: string;
  iicrc_discipline: string | null;
  cec_hours: number;
  cppp40421_unit_code: string | null;
  issued_date: string;
  verification_url: string;
  status: string;
}

type DisciplineKey = 'WRT' | 'CRT' | 'OCT' | 'ASD' | 'CCT';

const DISCIPLINE_COLOURS: Record<DisciplineKey, string> = {
  WRT: 'text-cyan-400 bg-cyan-400/10 border border-cyan-400/20',
  CRT: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20',
  OCT: 'text-amber-400 bg-amber-400/10 border border-amber-400/20',
  ASD: 'text-blue-400 bg-blue-400/10 border border-blue-400/20',
  CCT: 'text-fuchsia-400 bg-fuchsia-400/10 border border-fuchsia-400/20',
};

const DEFAULT_DISCIPLINE_COLOUR = 'text-zinc-400 bg-zinc-400/10 border border-zinc-400/20';

function disciplineColour(discipline: string | null): string {
  if (!discipline) return DEFAULT_DISCIPLINE_COLOUR;
  return DISCIPLINE_COLOURS[discipline as DisciplineKey] ?? DEFAULT_DISCIPLINE_COLOUR;
}

function CredentialCard({ credential }: { credential: CredentialOut }) {
  const pdfUrl = `${API}/api/lms/credentials/${credential.credential_id}/pdf`;
  const issuedDate = new Date(credential.issued_date);

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-zinc-900/50 p-5">
      {/* Discipline badge + title */}
      <div className="flex flex-col gap-2">
        {credential.iicrc_discipline && (
          <span
            className={`inline-flex w-fit items-center rounded-sm px-2.5 py-1 font-mono text-xs ${disciplineColour(credential.iicrc_discipline)}`}
          >
            {credential.iicrc_discipline}
          </span>
        )}
        <h3 className="text-sm leading-snug font-semibold text-foreground">{credential.course_title}</h3>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
            CEC Hours
          </span>
          <span className="font-mono text-sm text-foreground">{credential.cec_hours.toFixed(1)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs tracking-wider text-muted-foreground uppercase">Issued</span>
          <span className="font-mono text-sm text-foreground">{credential.issued_date}</span>
        </div>
        {credential.cppp40421_unit_code && (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs tracking-wider text-muted-foreground uppercase">Unit</span>
            <span className="font-mono text-sm text-muted-foreground">
              {credential.cppp40421_unit_code}
            </span>
          </div>
        )}
      </div>

      {/* LinkedIn share */}
      <LinkedInShareButton
        courseTitle={credential.course_title}
        iicrcDiscipline={credential.iicrc_discipline ?? ''}
        issuedYear={issuedDate.getFullYear()}
        issuedMonth={issuedDate.getMonth() + 1}
        credentialId={credential.credential_id}
        credentialUrl={credential.verification_url}
      />

      {/* Action links */}
      <div className="flex gap-3 border-t border-border pt-4">
        <Link
          href={`/credentials/${credential.credential_id}`}
          className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-center font-mono text-xs text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground"
        >
          View Certificate
        </Link>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-sm border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-center font-mono text-xs text-cyan-400 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10"
        >
          Download PDF
        </a>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-zinc-900/50 px-6 py-12 text-center">
      <Award className="h-10 w-10 text-muted-foreground/20" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">No credentials yet.</p>
        <p className="text-sm text-muted-foreground/50">Complete a course to earn your first certificate.</p>
      </div>
      <Link
        href="/courses"
        className="mt-2 rounded-md border border-border bg-secondary px-4 py-2 font-mono text-xs text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground"
      >
        Browse Courses
      </Link>
    </div>
  );
}

export default function StudentCredentialsPage() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<CredentialOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredentials = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<CredentialOut[]>('/api/lms/credentials/me');
      setCredentials(data);
    } catch {
      setError('Failed to load credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  return (
    <main className="flex max-w-4xl flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">My Credentials</h1>
        <p className="text-sm text-muted-foreground">
          Your completed course certificates and IICRC continuing education credits.
        </p>
      </div>

      {/* Loading */}
      {loading && <p className="text-sm text-muted-foreground/50">Loading credentials…</p>}

      {/* Error */}
      {!loading && error && <ErrorBanner message={error} onRetry={fetchCredentials} />}

      {/* Credential count */}
      {!loading && !error && (
        <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
          {credentials.length === 0
            ? 'No credentials earned'
            : `${credentials.length} credential${credentials.length === 1 ? '' : 's'} earned`}
        </p>
      )}

      {/* Grid or empty state */}
      {!loading && !error && credentials.length === 0 && <EmptyState />}

      {!loading && !error && credentials.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {credentials.map((cred) => (
            <CredentialCard key={cred.credential_id} credential={cred} />
          ))}
        </div>
      )}
    </main>
  );
}
