'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, FileText, Link2, Loader2 } from 'lucide-react';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { LinkedInShareButton } from '@/components/lms/LinkedInShareButton';
import { useAuth } from '@/components/auth/auth-provider';
import { formatCecHoursForDisplay } from '@/lib/cec-display';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';

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
  WRT: 'text-cyan-700 bg-cyan-50 border border-cyan-200',
  CRT: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
  OCT: 'text-amber-700 bg-amber-50 border border-amber-200',
  ASD: 'text-blue-700 bg-blue-50 border border-blue-200',
  CCT: 'text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200',
};

const DEFAULT_DISCIPLINE_COLOUR = 'text-slate-600 bg-slate-50 border border-slate-200';

function disciplineColour(discipline: string | null): string {
  if (!discipline) return DEFAULT_DISCIPLINE_COLOUR;
  return DISCIPLINE_COLOURS[discipline as DisciplineKey] ?? DEFAULT_DISCIPLINE_COLOUR;
}

function formatCecHours(hours: number): string {
  const label = formatCecHoursForDisplay(hours);
  if (!label) return '—';
  return `${label} IICRC CEC hour${label === '1' ? '' : 's'}`;
}

function CredentialCard({ credential }: { credential: CredentialOut }) {
  const pdfUrl = `/api/lms/credentials/${encodeURIComponent(credential.credential_id)}?pdf=1`;
  const issuedDate = new Date(credential.issued_date);

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white border border-slate-200 p-5">
      {/* Discipline badge + title */}
      <div className="flex flex-col gap-2">
        {credential.iicrc_discipline && (
          <span
            className={`inline-flex w-fit items-center rounded-sm px-2.5 py-1 font-mono text-xs ${disciplineColour(credential.iicrc_discipline)}`}
          >
            {credential.iicrc_discipline}
          </span>
        )}
        <h3 className="text-sm leading-snug font-semibold text-slate-900">{credential.course_title}</h3>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs tracking-widest text-slate-500 uppercase">
            IICRC CEC hours
          </span>
          <span className="font-mono text-sm text-slate-900">{formatCecHours(credential.cec_hours)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs tracking-widest text-slate-500 uppercase">Issued</span>
          <span className="font-mono text-sm text-slate-900">{credential.issued_date}</span>
        </div>
        {credential.cppp40421_unit_code && (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs tracking-widest text-slate-500 uppercase">Unit</span>
            <span className="font-mono text-sm text-slate-600">
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
      <div className="flex gap-3 border-t border-slate-200 pt-4">
        <Link
          href={`/dashboard/credentials/${credential.credential_id}`}
          className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-center font-mono text-xs text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
        >
          View Certificate
        </Link>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-sm border border-cyan-200 bg-cyan-50 px-3 py-2 text-center font-mono text-xs text-cyan-700 transition-colors hover:border-cyan-300 hover:bg-cyan-100"
        >
          Download PDF
        </a>
      </div>
    </div>
  );
}

function ProofPackCard() {
  const { toast } = useToast();
  const [minting, setMinting] = useState(false);

  const copyShareLink = async () => {
    setMinting(true);
    try {
      const data = await apiClient.post<{ url: string; expires_in_days: number }>(
        '/api/lms/credentials/proof-pack/share'
      );
      await navigator.clipboard.writeText(data.url);
      toast({
        title: 'Share link copied',
        description: `Anyone with the link can view this summary for about ${data.expires_in_days} days. Treat it like a password.`,
      });
    } catch {
      toast({
        title: 'Could not create link',
        description: 'Sign in again or try later.',
        variant: 'destructive',
      });
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="rounded-sm border border-[#2490ed]/25 bg-[#2490ed]/[0.06] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-white text-[#146fc2]">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="font-mono text-sm font-semibold text-slate-900">Employer proof pack</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
              One PDF or share link: completed courses, dates, IICRC CEC totals by discipline, and
              credential IDs with verification URLs — for HR or insurer evidence.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:shrink-0 sm:items-end">
          <a
            href="/api/lms/credentials/proof-pack/pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-cyan-200 bg-cyan-50 px-4 py-2.5 font-mono text-xs font-medium text-cyan-700 transition-colors hover:border-cyan-300 hover:bg-cyan-100"
          >
            Download PDF
          </a>
          <button
            type="button"
            onClick={copyShareLink}
            disabled={minting}
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-slate-200 bg-white px-4 py-2.5 font-mono text-xs font-medium text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            {minting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Link2 className="h-3.5 w-3.5" aria-hidden />
            )}
            Copy share link
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-sm border border-slate-200 bg-white border border-slate-200 px-6 py-12 text-center">
      <Award className="h-10 w-10 text-slate-200" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-slate-500">No credentials yet.</p>
        <p className="text-sm text-slate-400">Complete a course to earn your first certificate.</p>
      </div>
      <Link
        href="/dashboard/courses"
        className="mt-2 rounded-sm border border-slate-200 bg-slate-50 px-4 py-2 font-mono text-xs text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
      >
        Browse courses
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
        <h1 className="font-mono text-2xl font-bold text-slate-900">My Credentials</h1>
        <p className="text-sm text-slate-500">
          Your completed course certificates and IICRC continuing education credits.
        </p>
      </div>

      {user && <ProofPackCard />}

      {/* Loading */}
      {loading && <p className="text-sm text-slate-400">Loading credentials…</p>}

      {/* Error */}
      {!loading && error && <ErrorBanner message={error} onRetry={fetchCredentials} />}

      {/* Credential count */}
      {!loading && !error && (
        <p className="font-mono text-xs tracking-widest text-slate-500 uppercase">
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
