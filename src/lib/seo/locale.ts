/**
 * Site locale, one record (backlog row 19, NZ locale pass).
 *
 * CARSI serves Australia and New Zealand (DECISIONS #35) from ONE set of URLs written in
 * Australian English. So:
 * - `<html lang>` and JSON-LD `inLanguage` stay `en-AU`: that is the language the pages are
 *   written in, and `check:au-english` enforces it.
 * - Open Graph declares `en_AU` as the locale and `en_NZ` as an alternate locale, telling
 *   social and answer engines the same page is meant for NZ readers too.
 * - No hreflang. There is no separate NZ URL, and pages that set their own `alternates`
 *   would drop an inherited `languages` map, so hreflang would appear on some pages only.
 *   Revisit if an NZ-specific URL is ever built.
 *
 * Every page that sets its own `openGraph` replaces the root one wholesale (Next does not
 * deep-merge it), so those pages spread `OG_LOCALE_FIELDS` rather than writing a literal.
 */
export const SITE_LANG = 'en-AU';

export const OG_LOCALE = 'en_AU';

export const OG_ALTERNATE_LOCALES: string[] = ['en_NZ'];

/** Spread into any `openGraph` object: `{ ...OG_LOCALE_FIELDS, title, … }`. */
export const OG_LOCALE_FIELDS = {
  locale: OG_LOCALE,
  alternateLocale: OG_ALTERNATE_LOCALES,
};
