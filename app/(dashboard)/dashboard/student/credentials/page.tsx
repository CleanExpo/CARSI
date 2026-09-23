'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { LinkedInShareButton } from '@/components/lms/LinkedInShareButton';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api/client';
import { formatCecHoursForDisplay } from '@/lib/cec-display';
import { RENEWAL_CEC_REQUIRED } from '@/types/renewal';
import { ArrowRight, Award, Download, FileText, Link2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

const surface = 'learner-home-surface learner-home-card overflow-hidden rounded-[1.25rem]';
const inset = 'learner-home-inset';
const kicker =
  'bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-200 bg-clip-text text-[11px] font-semibold tracking-[0.2em] text-transparent uppercase';
const heading = 'font-semibold tracking-[-0.02em] text-white';
const muted = 'text-slate-300/80';
const btn =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-white via-sky-50 to-white px-5 py-2.5 text-[13px] font-semibold text-slate-950 shadow-[0_10px_28px_-10px_rgba(56,189,248,0.8)] transition hover:from-sky-50 hover:to-white';
const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-[13px] font-semibold text-sky-100 transition hover:border-sky-200/40 hover:bg-white/10';

function formatIssued(iso: string): string {
  const issuedDate = new Date(iso);
  if (Number.isNaN(issuedDate.getTime())) return iso;
  return issuedDate.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatCecHours(hours: number): string {
  const label = formatCecHoursForDisplay(hours);
  if (!label) return 'No approved IICRC CEC hours';
  return `${label} IICRC CEC hour${label === '1' ? '' : 's'}`;
}

function ProgressTrack({ percent }: { percent: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div
      className="learner-home-bar h-2 overflow-hidden rounded-full bg-white/10"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <i
        className="rounded-full bg-gradient-to-r from-sky-300 to-[#2490ed]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function BrandRing({
  percent,
  size,
  stroke,
  id,
}: {
  percent: number;
  size: number;
  stroke: number;
  id: string;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const mid = size / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={mid}
          cy={mid}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={mid}
          cy={mid}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (pct / 100) * circ}
        />
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2={size} y2={size}>
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#2490ed" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[1.2rem] font-semibold text-white tabular-nums">
        {pct}
        <span className="text-[0.65rem] text-slate-400">%</span>
      </span>
    </div>
  );
}

function CredentialCard({ credential }: { credential: CredentialOut }) {
  const pdfUrl = `/api/lms/credentials/${encodeURIComponent(credential.credential_id)}?pdf=1`;
  const issuedDate = new Date(credential.issued_date);
  const cecLabel = formatCecHours(credential.cec_hours);
  const hasCec = (formatCecHoursForDisplay(credential.cec_hours) ?? null) != null;

  return (
    <article className={`${surface} flex h-full flex-col`}>
      <div className="learner-home-thumb h-20 border-b border-white/10" aria-hidden />
      <div className="flex flex-1 flex-col px-6 py-6">
        <div className="flex items-start gap-4">
          <span
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${inset} text-sky-200`}
          >
            <Award className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className={kicker}>{hasCec ? 'IICRC CEC Accredited' : 'CARSI certificate'}</p>
            <h3 className={`mt-2 text-[1.15rem] leading-snug ${heading}`}>
              {credential.course_title}
            </h3>
            <p className={`mt-2 text-[13px] ${muted}`}>
              Issued {formatIssued(credential.issued_date)}
            </p>
            <p className={`mt-1 text-[13px] ${muted}`}>{cecLabel}</p>
            <p className="mt-3 text-[11px] tracking-wide text-slate-400 uppercase">
              Certificate {credential.credential_id}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <LinkedInShareButton
            courseTitle={credential.course_title}
            iicrcDiscipline={credential.iicrc_discipline ?? ''}
            issuedYear={
              Number.isNaN(issuedDate.getTime())
                ? new Date().getFullYear()
                : issuedDate.getFullYear()
            }
            issuedMonth={Number.isNaN(issuedDate.getTime()) ? 1 : issuedDate.getMonth() + 1}
            credentialId={credential.credential_id}
            credentialUrl={credential.verification_url}
          />
        </div>
        <div className="mt-auto flex flex-wrap gap-2 border-t border-white/10 pt-5">
          <Link href={`/dashboard/credentials/${credential.credential_id}`} className={btn}>
            View certificate
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={btnGhost}>
            <Download className="h-4 w-4" aria-hidden />
            Download
          </a>
        </div>
      </div>
    </article>
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
        description: `Anyone with the link can view this summary for about ${data.expires_in_days} days.`,
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
    <section className={`${surface} learner-home-surface--hero px-7 py-7 sm:px-9`}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-2xl gap-4">
          <span
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${inset} text-sky-200`}
          >
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className={kicker}>Share with an employer</p>
            <h2 className={`mt-2 text-[1.35rem] ${heading}`}>Employer proof pack</h2>
            <p className={`mt-2 text-[15px] leading-6 ${muted}`}>
              One PDF or share link with completed courses, dates, approved IICRC CEC totals, and
              public verification URLs.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/lms/credentials/proof-pack/pdf"
            target="_blank"
            rel="noopener noreferrer"
            className={btn}
          >
            <Download className="h-4 w-4" aria-hidden />
            Download PDF
          </a>
          <button
            type="button"
            onClick={() => void copyShareLink()}
            disabled={minting}
            className={btnGhost}
          >
            {minting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Link2 className="h-4 w-4" aria-hidden />
            )}
            Copy share link
          </button>
        </div>
      </div>
    </section>
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
      setCredentials(await apiClient.get<CredentialOut[]>('/api/lms/credentials/me'));
    } catch {
      setError('We could not load your certificates.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    fetchCredentials();
  }, [fetchCredentials]);

  const approvedCec = useMemo(
    () => credentials.reduce((sum, c) => sum + (c.cec_hours > 0 ? c.cec_hours : 0), 0),
    [credentials]
  );
  const cecTarget = RENEWAL_CEC_REQUIRED;
  const cecPct = Math.min(100, (approvedCec / cecTarget) * 100);
  const cecRemaining = Math.max(0, cecTarget - approvedCec);
  const cecLabel = formatCecHoursForDisplay(approvedCec);

  return (
    <div className="learner-home -mx-4 w-[calc(100%+2rem)] min-w-0 space-y-10 px-4 pb-16 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:-mx-10 lg:w-[calc(100%+5rem)] lg:px-10">
      <header className="relative">
        <p className="text-[13px] text-slate-500">Your professional record</p>
        <h1 className="mt-2 text-[2.4rem] leading-[1.05] font-semibold tracking-tight text-slate-950 sm:text-[2.75rem]">
          Certificates
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-6 text-slate-500">
          CARSI designations, downloads, and approved IICRC CEC hours — only where the IICRC has
          confirmed them.
        </p>
      </header>

      {user && !loading && !error && credentials.length > 0 ? (
        <section className="grid w-full items-stretch gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className={`${surface} px-7 py-7`}>
            <p className={kicker}>Your record</p>
            <dl className="mt-7 grid grid-cols-2 gap-4">
              <div className={`${inset} rounded-xl px-4 py-5`}>
                <dt className={`text-[11px] ${muted}`}>
                  {credentials.length === 1 ? 'Certificate' : 'Certificates'}
                </dt>
                <dd className={`mt-2 text-[2.2rem] leading-none tabular-nums ${heading}`}>
                  {credentials.length}
                </dd>
              </div>
              <div className={`${inset} rounded-xl px-4 py-5`}>
                <dt className={`text-[11px] ${muted}`}>Approved IICRC CEC hours</dt>
                <dd className={`mt-2 text-[2.2rem] leading-none tabular-nums ${heading}`}>
                  {cecLabel ?? '0'}
                </dd>
              </div>
            </dl>
          </div>
          <div className={`${surface} flex flex-col px-7 py-7`}>
            <p className={kicker}>IICRC CEC progress</p>
            <div className="mt-6 flex items-center gap-5">
              <BrandRing percent={cecPct} size={84} stroke={7} id="cred-cec-ring" />
              <p className={`text-[2.1rem] leading-none tabular-nums ${heading}`}>
                {cecLabel ?? '0'}
                <span className="text-[1.05rem] font-medium text-slate-400">/{cecTarget}</span>
              </p>
            </div>
            <div className="mt-6">
              <ProgressTrack percent={cecPct} />
            </div>
            <p className={`mt-3 text-[13px] ${muted}`}>
              {approvedCec >= cecTarget
                ? 'Renewal target reached'
                : `${formatCecHoursForDisplay(cecRemaining) ?? cecRemaining} CECs remaining toward the ${cecTarget}-hour renewal target. Unapproved courses add none.`}
            </p>
          </div>
        </section>
      ) : null}

      {user ? <ProofPackCard /> : null}

      {loading ? (
        <div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2"
          aria-busy="true"
          aria-label="Loading certificates"
        >
          {[1, 2].map((i) => (
            <div key={i} className={`${surface} h-64 animate-pulse`} />
          ))}
        </div>
      ) : null}

      {!loading && error ? <ErrorBanner message={error} onRetry={fetchCredentials} /> : null}

      {!loading && !error && credentials.length === 0 ? (
        <section className={`${surface} learner-home-surface--hero px-8 py-14 text-center`}>
          <span
            className={`mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl ${inset} text-sky-200`}
          >
            <Award className="h-6 w-6" aria-hidden />
          </span>
          <h2 className={`mt-5 text-[1.4rem] ${heading}`}>No certificates yet</h2>
          <p className={`mx-auto mt-2 max-w-md text-[15px] leading-6 ${muted}`}>
            Complete your first course to earn a CARSI certificate. Approved IICRC CEC hours appear
            here only after IICRC confirmation.
          </p>
          <Link href="/dashboard/courses" className={`${btn} mt-8`}>
            View courses
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      ) : null}

      {!loading && !error && credentials.length > 0 ? (
        <section className="w-full">
          <div className="mb-5">
            <h2 className="text-[1.4rem] font-semibold tracking-tight text-slate-950">
              Issued certificates
            </h2>
            <p className="mt-1 text-[14px] text-slate-500">Download, verify, or add to LinkedIn.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {credentials.map((cred) => (
              <CredentialCard key={cred.credential_id} credential={cred} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
