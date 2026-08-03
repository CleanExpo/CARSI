/**
 * Inner width for public marketing chrome. Must match {@link PublicNavbar} and {@link PublicFooter}.
 */
export const PUBLIC_SHELL_INNER_CLASS = 'mx-auto w-[94%] xl:w-[85%] 2xl:max-w-[1800px]';

/** Full-width page body, used for marketing and industry pages (no max-width cap). */
export const PUBLIC_PAGE_FULL_CLASS = 'w-full';

/** Dark-tinted public chrome. Light wordmark stays readable; pairs with light page body. */
export const PUBLIC_CHROME_NAV_CLASS =
  'relative sticky top-0 z-50 border-b border-white/[0.08] bg-[#0f172a] bg-gradient-to-b from-[#152238] via-[#0f172a] to-[#0d1524] shadow-[0_8px_32px_-16px_rgba(15,23,42,0.55)] backdrop-blur-md';

export const PUBLIC_CHROME_FOOTER_CLASS =
  'border-t border-white/[0.08] bg-[#0b1220] bg-gradient-to-b from-[#0f172a] via-[#0d1524] to-[#0a101c]';

export const PUBLIC_CHROME_LINK_CLASS =
  'rounded-md px-2 py-2 text-sm font-medium text-white/78 transition-colors duration-150 hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none';

export const PUBLIC_CHROME_BODY_CLASS = 'text-white/62';

export const PUBLIC_CHROME_HEADING_CLASS =
  'text-[10px] font-semibold tracking-wide text-white/55 uppercase';

export const PUBLIC_CHROME_AUTH_BAND_CLASS =
  'relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#152238] via-[#0f172a] to-[#0d1524] px-6 py-10 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.65)]';

/** Light professional chrome, used on the homepage and other light marketing surfaces. */
export const PUBLIC_LIGHT_NAV_CLASS =
  'relative sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.18)] backdrop-blur-xl';

export const PUBLIC_LIGHT_FOOTER_CLASS =
  'relative overflow-hidden border-t border-slate-200/80 bg-white';

export const PUBLIC_LIGHT_LINK_CLASS =
  'rounded-md px-2 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none';

/** Shared landing type helpers: Outfit display plus calm body. Refined weights, never heavy bold. */
export const LANDING_EYEBROW_CLASS =
  'text-[11px] font-medium tracking-[0.24em] text-[#146fc2] uppercase';

export const LANDING_DISPLAY_H2_CLASS =
  'font-[family-name:var(--font-display)] text-[1.9rem] leading-[1.12] font-semibold tracking-[-0.02em] text-slate-950 md:text-[2.6rem] md:leading-[1.08]';

export const LANDING_LEAD_CLASS = 'text-[15px] leading-relaxed text-slate-500 md:text-base';

/** Large editorial statement type for narrative bands. */
export const LANDING_STATEMENT_CLASS =
  'font-[family-name:var(--font-display)] text-[1.6rem] leading-[1.3] font-normal tracking-[-0.015em] md:text-[2.2rem] md:leading-[1.28]';
