'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Award, RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getUserId(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('carsi_user_id') ?? '') : '';
}

function authHeaders(): Record<string, string> {
  const id = getUserId();
  return id ? { 'X-User-Id': id } : {};
}

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

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-auto flex items-center gap-1 rounded-sm bg-red-900/50 px-2 py-1 text-xs hover:bg-red-900/70"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}

function CredentialCard({ credential }: { credential: CredentialOut }) {
  const pdfUrl = `${API}/api/lms/credentials/${credential.credential_id}/pdf`;

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
          <span className="font-mono text-sm text-white">
            {credential.cec_hours.toFixed(1)} CEC Hours
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs tracking-widest text-white/40 uppercase">Issued</span>
          <span className="font-mono text-sm text-white">{formatDate(credential.issued_date)}</span>
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

      {/* Action links */}
      <div className="flex gap-3 border-t border-white/[0.06] pt-4">
        <Link
          href={`/credentials/${credential.credential_id}`}
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
  const [credentials, setCredentials] = useState<CredentialOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredentials = async () => {
    const headers = authHeaders();
    if (!headers['X-User-Id']) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/api/lms/credentials/me`, { headers });
      if (r.ok) {
        setCredentials(await r.json());
      } else {
        setError('Failed to load credentials. Please try again.');
      }
    } catch {
      setError('Network error loading credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  return (
    <main className="flex max-w-4xl flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-bold text-white">My Credentials</h1>
        <p className="text-sm text-white/40">
          Your completed course certificates and IICRC continuing education credits.
        </p>
      </div>

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
