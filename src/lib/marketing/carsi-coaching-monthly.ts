/** CARSI Business Coaching — scalable monthly program (LMS + monthly owner session). */
export const carsiCoachingMonthlyPath = '/ccw-training';

export const carsiCoachingWorkshopPath = '/ccw-training/workshop';

export const carsiCoachingMonthlyPriceCents = 49_500;

export const carsiCoachingProductName = 'CARSI Business Coaching';

export const carsiCoachingMonthlyTagline =
  'Build the business you already have — marketing, direction, AI, and a living plan — without buying more gear to hide the gaps.';

export function formatCoachingAudFromCents(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`;
}

export const carsiCoachingMonthlyPriceLabel = `${formatCoachingAudFromCents(
  carsiCoachingMonthlyPriceCents
)}/month`;
