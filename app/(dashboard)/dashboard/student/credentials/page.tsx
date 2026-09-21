'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { LinkedInShareButton } from '@/components/lms/LinkedInShareButton';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api/client';
import { formatCecHoursForDisplay } from '@/lib/cec-display';
import { dash } from '@/lib/dashboard-light-ui';
import { FileText, Link2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

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

function formatCecHours(hours: number): string {
  const label = formatCecHoursForDisplay(hours);
  if (!label) return 'No approved CEC hours';
  return `${label} IICRC CEC hour${label === '1' ? '' : 's'}`;
}

function CredentialCard({ credential }: { credential: CredentialOut }) {
  const pdfUrl = `/api/lms/credentials/${encodeURIComponent(credential.credential_id)}?pdf=1`;
  const issuedDate = new Date(credential.issued_date);
  const issuedLabel = Number.isNaN(issuedDate.getTime())
    ? credential.issued_date
    : issuedDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h3 className="text-base font-semibold text-slate-900">{credential.course_title}</h3>
        <p className="mt-2 text-sm text-slate-500">Issued {issuedLabel}</p>
        <p className="mt-1 text-sm text-slate-500">{formatCecHours(credential.cec_hours)}</p>
        <p className="mt-1 text-xs text-slate-400">Certificate {credential.credential_id}</p>
      </div>
      <LinkedInShareButton
        courseTitle={credential.course_title}
        iicrcDiscipline={credential.iicrc_discipline ?? ''}
        issuedYear={issuedDate.getFullYear()}
        issuedMonth={issuedDate.getMonth() + 1}
        credentialId={credential.credential_id}
        credentialUrl={credential.verification_url}
      />
      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
        <Link
          href={`/dashboard/credentials/${credential.credential_id}`}
          className={dash.btnSecondary}
        >
          View certificate
        </Link>
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={dash.btnGhost}>
          Download
        </a>
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
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <FileText className="h-5 w-5 shrink-0 text-[#146fc2]" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Employer proof pack</h2>
            <p className={`mt-1 max-w-xl text-sm ${dash.muted}`}>
              One PDF or share link with completed courses, dates, approved IICRC CEC totals, and
              verification URLs.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/lms/credentials/proof-pack/pdf"
            target="_blank"
            rel="noopener noreferrer"
            className={dash.btnSecondary}
          >
            Download PDF
          </a>
          <button
            type="button"
            onClick={() => void copyShareLink()}
            disabled={minting}
            className={dash.btnGhost}
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

  return (
    <div className="max-w-9xl mx-auto flex w-full flex-col gap-8 pb-16">
      <header>
        <h1 className={dash.h1}>Certificates</h1>
        <p className={`mt-2 ${dash.lead}`}>Your professional achievements.</p>
      </header>

      {user ? <ProofPackCard /> : null}

      {loading ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          aria-busy="true"
          aria-label="Loading certificates"
        >
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      ) : null}

      {!loading && error ? <ErrorBanner message={error} onRetry={fetchCredentials} /> : null}

      {!loading && !error && credentials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="font-medium text-slate-900">
            Complete your first course to earn a certificate.
          </p>
          <Link href="/dashboard/courses" className={`mt-6 ${dash.btnPrimary}`}>
            View courses
          </Link>
        </div>
      ) : null}

      {!loading && !error && credentials.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {credentials.map((cred) => (
            <CredentialCard key={cred.credential_id} credential={cred} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
