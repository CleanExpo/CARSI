/** User-facing CEC label: whole numbers without decimals, halves as one decimal. */
export function formatCecHoursForDisplay(
  value: number | string | null | undefined
): string | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n % 1 === 0 ? String(Math.trunc(n)) : String(Number(n.toFixed(1)));
}

/** Certificate / credential band — omit placeholder copy when hours are unknown. */
export function formatCecHoursForCertificate(
  value: number | string | null | undefined
): string | null {
  const label = formatCecHoursForDisplay(value);
  if (!label) return null;
  const n = parseFloat(label);
  return `${label} IICRC CEC hour${n === 1 ? '' : 's'}`;
}
