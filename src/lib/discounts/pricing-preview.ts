export type DiscountTypePreview = 'percentage' | 'flat' | 'free' | 'custom';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Pure preview for admin UI (browser-safe). */
export function previewDiscountedAud(
  listAud: number,
  discountType: DiscountTypePreview,
  discountValue: number | null
): number {
  const list = Number.isFinite(listAud) && listAud >= 0 ? listAud : 0;
  const v = discountValue;
  switch (discountType) {
    case 'free':
      return 0;
    case 'percentage': {
      const pct = v ?? 0;
      if (!Number.isFinite(pct) || pct <= 0) return list;
      return round2(list * (1 - Math.min(100, Math.max(0, pct)) / 100));
    }
    case 'flat': {
      const off = v ?? 0;
      if (!Number.isFinite(off) || off <= 0) return list;
      return round2(Math.max(0, list - off));
    }
    case 'custom': {
      const price = v ?? 0;
      if (!Number.isFinite(price) || price < 0) return list;
      return round2(price);
    }
    default:
      return list;
  }
}
