import { isPartnerDemoEmail } from '@/lib/coaching-portal/partner-demo';

/** GP-637: tells everyone on screen that this workspace is the seeded partner demo. */
export function PartnerDemoBanner({ email }: { email: string | null | undefined }) {
  if (!isPartnerDemoEmail(email)) return null;
  return (
    <div
      role="status"
      data-testid="coaching-partner-demo-banner"
      className="border-b border-amber-400/30 bg-amber-400/10 px-4 py-2 text-center text-xs font-medium text-amber-100 sm:px-6"
    >
      Demo mode: sample business and data for partner demonstrations. Changes are reset when the
      demo is re-seeded.
    </div>
  );
}
