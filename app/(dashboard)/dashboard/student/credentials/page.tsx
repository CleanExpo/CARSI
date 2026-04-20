'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, FileText, Link2, Loader2 } from 'lucide-react';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { LinkedInShareButton } from '@/components/lms/LinkedInShareButton';
import { useAuth } from '@/components/auth/auth-provider';
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
  const pdfUrl = `/api/lms/credentials/${encodeURIComponent(credential.credential_id)}?pdf=1`;
  const issuedDate = new Date(credential.issued_date);

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-5">
      {/* Discipline badge + title */}
      <div className="flex flex-col gap-2">
        {credential.iicrc_discipline && (
          <span
            className={`inline-flex w-fit items-center rounded-sm px-2.5 py-1 font-mono text-xs ${disciplineColour(credential.iicrc_discipline)}`}
          >
            {credential.iicrc_discipline}
          </span>
        )}
        <h3 className="text-sm leading-snug font-semibold text-white">{credential.course_title}</h3>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs tracking-widest text-white/40 uppercase">
            CEC Hours
          </span>
          <span className="font-mono text-sm text-white">{credential.cec_hours.toFixed(1)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs tracking-widest text-white/40 uppercase">Issued</span>
          <span className="font-mono text-sm text-white">{credential.issued_date}</span>
        </div>
        {credential.cppp40421_unit_code && (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs tracking-widest text-white/40 uppercase">Unit</span>
            <span className="font-mono text-sm text-white/60">
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
      <div className="flex gap-3 border-t border-white/[0.06] pt-4">
        <Link
          href={`/dashboard/credentials/${credential.credential_id}`}
          className="flex-1 rounded-sm border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-center font-mono text-xs text-white/70 transition-colors hover:border-white/20 hover:text-white"
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-white/10 bg-white/5 text-[#7ec5ff]">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="font-mono text-sm font-semibold text-white">Employer proof pack</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/45">
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
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 font-mono text-xs font-medium text-cyan-300 transition-colors hover:border-cyan-400/50 hover:bg-cyan-400/15"
          >
            Download PDF
          </a>
          <button
            type="button"
            onClick={copyShareLink}
            disabled={minting}
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-white/10 bg-white/[0.04] px-4 py-2.5 font-mono text-xs font-medium text-white/80 transition-colors hover:border-white/20 hover:bg-white/[0.07] disabled:opacity-50"
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
    <div className="flex flex-col items-center gap-4 rounded-sm border border-white/[0.06] bg-zinc-900/50 px-6 py-12 text-center">
      <Award className="h-10 w-10 text-white/10" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-white/40">No credentials yet.</p>
        <p className="text-sm text-white/30">Complete a course to earn your first certificate.</p>
      </div>
      <Link
        href="/courses"
        className="mt-2 rounded-sm border border-white/[0.08] bg-white/[0.03] px-4 py-2 font-mono text-xs text-white/60 transition-colors hover:border-white/20 hover:text-white"
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
        <h1 className="font-mono text-2xl font-bold text-white">My Credentials</h1>
        <p className="text-sm text-white/40">
          Your completed course certificates and IICRC continuing education credits.
        </p>
      </div>

      {user && <ProofPackCard />}

      {/* Loading */}
      {loading && <p className="text-sm text-white/30">Loading credentials…</p>}

      {/* Error */}
      {!loading && error && <ErrorBanner message={error} onRetry={fetchCredentials} />}

      {/* Credential count */}
      {!loading && !error && (
        <p className="font-mono text-xs tracking-widest text-white/40 uppercase">
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
