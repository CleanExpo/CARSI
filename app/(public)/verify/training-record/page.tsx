'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Download, ExternalLink, Loader2 } from 'lucide-react';

import type { ProofPackPayload } from '@/types/proof-pack';

function formatGenerated(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-AU', { dateStyle: 'long', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function TrainingRecordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('t')?.trim() ?? '';

  const [data, setData] = useState<ProofPackPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      setError('This page needs a valid link. Ask the learner to copy it from My Credentials.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/proof-pack?t=${encodeURIComponent(token)}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { detail?: string };
        setError(j.detail ?? 'Could not load this record.');
        setData(null);
        return;
      }
      setData((await res.json()) as ProofPackPayload);
    } catch {
      setError('Network error. Try again later.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const pdfHref = token ? `/api/public/proof-pack/pdf?t=${encodeURIComponent(token)}` : '#';

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <p className="text-[10px] font-semibold tracking-[0.22em] text-white/35 uppercase">
        CARSI verification
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
        Training &amp; CEC summary
      </h1>
      <p className="mt-2 text-sm text-white/45">
        For employer, HR, or insurer evidence. Each course links to a public credential check.
      </p>

      {loading && (
        <div className="mt-10 flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading record…
        </div>
      )}

      {!loading && error && (
        <div
          className="mt-10 flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" aria-hidden />
          <div>
            <p className="font-medium">{error}</p>
            <Link href="/login" className="mt-2 inline-block text-[#7ec5ff] hover:underline">
              Learner sign in
            </Link>
          </div>
        </div>
      )}

      {!loading && data && (
        <div className="mt-10 space-y-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-semibold tracking-widest text-white/35 uppercase">
                  Learner
                </dt>
                <dd className="mt-1 font-medium text-white">{data.learner_name}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold tracking-widest text-white/35 uppercase">
                  Email
                </dt>
                <dd className="mt-1 text-white/70">{data.learner_email}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold tracking-widest text-white/35 uppercase">
                  Issuer
                </dt>
                <dd className="mt-1 text-white/70">{data.issuing_organisation}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold tracking-widest text-white/35 uppercase">
                  Generated
                </dt>
                <dd className="mt-1 text-white/70">{formatGenerated(data.generated_at)}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-[10px] font-semibold tracking-widest text-white/35 uppercase">
                  Completed courses
                </p>
                <p className="mt-1 text-xl font-semibold text-white">{data.summary.completed_courses}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-widest text-white/35 uppercase">
                  Total CEC hours
                </p>
                <p className="mt-1 text-xl font-semibold text-[#7ec5ff]">
                  {data.summary.total_cec_hours}
                </p>
              </div>
            </div>
            <a
              href={pdfHref}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2490ed] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1f82d4]"
            >
              <Download className="h-4 w-4" aria-hidden />
              Download PDF pack
            </a>
          </div>

          {data.cec_by_discipline.length > 0 && (
            <section aria-labelledby="cec-heading">
              <h2 id="cec-heading" className="text-sm font-semibold text-white">
                CEC by discipline
              </h2>
              <ul className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">
                {data.cec_by_discipline.map((row) => (
                  <li
                    key={row.discipline}
                    className="flex items-center justify-between px-4 py-3 text-sm text-white/80"
                  >
                    <span className="font-mono text-xs text-white/90">{row.discipline}</span>
                    <span className="tabular-nums text-white/60">{row.cec_hours} hrs</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="courses-heading">
            <h2 id="courses-heading" className="text-sm font-semibold text-white">
              Completed courses &amp; credential IDs
            </h2>
            <ul className="mt-3 space-y-4">
              {data.credentials.map((c) => (
                <li
                  key={c.credential_id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm"
                >
                  <p className="font-medium text-white">{c.course_title}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {c.iicrc_discipline ?? '—'} · {c.cec_hours} CEC · issued {c.issued_date}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-white/35">ID {c.credential_id}</p>
                  <a
                    href={c.verification_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#7ec5ff] hover:underline"
                  >
                    Verify credential
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
            {data.credentials.length === 0 && (
              <p className="mt-3 text-sm text-white/40">No completed courses on this record.</p>
            )}
          </section>

          <p className="text-xs text-white/30">
            Shared links expire after a limited time and should be treated as confidential.
          </p>
        </div>
      )}
    </main>
  );
}

function TrainingRecordFallback() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <div className="flex items-center gap-2 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading…
      </div>
    </main>
  );
}

export default function TrainingRecordPage() {
  return (
    <Suspense fallback={<TrainingRecordFallback />}>
      <TrainingRecordContent />
    </Suspense>
  );
}
