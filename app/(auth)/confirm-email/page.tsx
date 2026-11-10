import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * GP-699 — landing page for the confirm link in the welcome email.
 *
 * Opening this page changes nothing. The account is marked verified only when
 * the person presses the button, which POSTs the token to
 * /api/auth/verify-email. A mail scanner that follows the link therefore
 * cannot confirm an address. A plain HTML form, so it works without JavaScript.
 */
export const metadata: Metadata = {
  title: 'Confirm your email',
  robots: { index: false, follow: false },
  // The link token is in this page's address: never send it on as a referrer.
  referrer: 'no-referrer',
};

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token: rawToken } = await searchParams;
  const token = typeof rawToken === 'string' ? rawToken.trim() : '';

  return (
    <div
      className="rounded-xl bg-white p-6 shadow-xl ring-1 shadow-slate-200/70 ring-slate-200 sm:p-8"
      style={{
        border: '1px solid rgba(15,23,42,0.05)',
      }}
    >
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-bold text-slate-950">Confirm your email</h1>
        <p className="text-sm text-slate-600">
          {token
            ? 'Press the button to confirm the email address on your CARSI account.'
            : 'This confirmation link is incomplete.'}
        </p>
      </div>

      {token ? (
        <form method="post" action="/api/auth/verify-email">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="min-h-12 w-full rounded-lg py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: '#9a4a00' }}
          >
            Confirm my email
          </button>
        </form>
      ) : (
        <p
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          Open the link from your welcome email again. You can still sign in without it.
        </p>
      )}

      <div className="mt-5 text-center text-sm">
        <Link
          href="/login"
          className="font-semibold text-[#146fc2] underline decoration-[#146fc2]/25 underline-offset-4 transition-colors duration-150 hover:text-[#0f5fa8]"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
