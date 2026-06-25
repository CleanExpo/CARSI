/** User-facing CEC label: whole numbers without decimals, halves as one decimal. */
export function formatCecHoursForDisplay(
  value: number | string | null | undefined
): string | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n % 1 === 0 ? String(Math.trunc(n)) : String(Number(n.toFixed(1)));
}
