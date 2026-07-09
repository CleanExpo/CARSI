/**
 * IicrcMark — gated IICRC logo/mark.
 *
 * TRADEMARK GATE (licence-critical): the IICRC Logo may be used ONLY by
 * registered IICRC Certified Firms using the authorised asset. Being a CEC
 * provider does not, by itself, grant IICRC-logo rights, and IICRC publicly
 * names firms that use the logo without rights (iicrc.org/invalid-firms,
 * verified). Until CARSI's registration status + written permission + the real
 * authorised asset are confirmed (Bucket B), this component renders NOTHING.
 *
 * To enable after Bucket B is confirmed:
 *   1. Drop the IICRC-supplied asset at the path in IICRC_MARK_ASSET.
 *   2. Set IICRC_MARK_ENABLED = true.
 * Placement map: docs/iicrc-compliance.md.
 */

/** Flip to true ONLY after registration + written permission + asset are confirmed. */
export const IICRC_MARK_ENABLED = false as boolean;

/** Path to the authorised IICRC asset. Empty until IICRC supplies it. */
export const IICRC_MARK_ASSET = '';

export interface IicrcMarkProps {
  /** Accessible label for the mark. */
  alt?: string;
  /** Rendered width in px. */
  width?: number;
  /** Rendered height in px. */
  height?: number;
  className?: string;
}

export function IicrcMark({
  alt = 'IICRC',
  width = 96,
  height = 96,
  className,
}: IicrcMarkProps) {
  if (!IICRC_MARK_ENABLED || !IICRC_MARK_ASSET) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={IICRC_MARK_ASSET}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
