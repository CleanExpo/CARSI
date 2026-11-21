import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  listUnresolvedUnfulfilledPayments,
  type UnfulfilledPaymentRow,
} from '@/lib/server/payment-integrity-ledger';

export const dynamic = 'force-dynamic';

const REASON_LABELS: Record<string, string> = {
  learner_unmatched: 'Paid, but no CARSI account matches the buyer',
  already_on_team: 'Team purchase by a buyer already on another team',
  fulfilment_failed: 'Roadshow or coaching fulfilment failed',
  team_unresolved: 'Live team subscription with no CARSI team',
  org_not_provisioned: 'Live organisation subscription with no CARSI record yet',
  subscriber_unresolved: 'Live subscription with no matching CARSI account',
};

function stripeDashboardUrl(stripeObjectId: string): string {
  const path = stripeObjectId.startsWith('sub_') ? 'subscriptions' : 'checkout/sessions';
  return `https://dashboard.stripe.com/${path}/${encodeURIComponent(stripeObjectId)}`;
}

/** GP-759: paid Stripe events the webhook could not fulfil, so none is lost silently. */
export default async function AdminUnfulfilledPaymentsPage() {
  // The admin layout already refuses non-admins; checked again here because this lists payments.
  if (!(await getAdminSessionOrNull())) return null;

  let rows: UnfulfilledPaymentRow[] = [];
  let loadError = false;
  try {
    rows = await listUnresolvedUnfulfilledPayments();
  } catch (error) {
    console.error('[admin/unfulfilled-payments] list failed', error);
    loadError = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Unfulfilled payments</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/70">
          Stripe payments that the platform received but could not turn into access. Each one
          needs a person to check it in Stripe and either grant access or refund. A record
          disappears from this list once a later delivery or the buyer&apos;s own payment page
          fulfils it. Nothing on this page emails the customer.
        </p>
      </div>

      {loadError ? (
        <p role="alert" className="rounded-md border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
          The list could not be loaded. This is not the same as an empty list; try again.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-white/70">No unfulfilled payments.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3">First seen</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Stripe record</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.stripeObjectId} className="border-t border-white/10">
                  <td className="whitespace-nowrap px-4 py-3">
                    {new Date(row.firstSeenAt).toLocaleString('en-AU', {
                      timeZone: 'Australia/Sydney',
                    })}
                  </td>
                  <td className="px-4 py-3">{REASON_LABELS[row.reason] ?? row.reason}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <a
                      href={stripeDashboardUrl(row.stripeObjectId)}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {row.stripeObjectId}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
