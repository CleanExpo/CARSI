import {
  carsiCoachingMonthlyPriceLabel,
  carsiCoachingProductName,
} from '@/lib/marketing/carsi-coaching-monthly';

export function CoachingComingSoonBanner({ label }: { label?: string }) {
  return (
    <div
      className="rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
    >
      <p className="font-semibold">{label ?? 'Coming soon'}</p>
      <p className="mt-1 leading-relaxed text-amber-900/90">
        We are finishing add-on booking. The{' '}
        <strong>
          {carsiCoachingMonthlyPriceLabel} {carsiCoachingProductName}
        </strong>{' '}
        subscription and its coaching portal are live today — email support@carsi.com.au to arrange
        an add-on in the meantime.
      </p>
    </div>
  );
}
