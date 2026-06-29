/**
 * Shared presentation tokens for CARSI marketing & industry pages.
 * All tokens support light + dark via the global `.dark` class on `<html>`.
 */

export const marketingPageBg =
  'bg-[#f6f8fb] text-slate-900 transition-colors duration-300 dark:bg-[#060a14] dark:text-white';

export const marketingPanel =
  'rounded-xl border border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md dark:border-white/[0.08] dark:bg-gradient-to-b dark:from-white/[0.07] dark:to-white/[0.02] dark:shadow-none';

export const marketingPanelHover =
  'transition duration-300 hover:-translate-y-0.5 hover:border-[#2490ed]/35 hover:shadow-[0_20px_56px_-24px_rgba(36,144,237,0.18)] dark:hover:border-[#2490ed]/30 dark:hover:shadow-[0_20px_56px_-24px_rgba(36,144,237,0.25)]';

export const marketingSection =
  'border-t border-slate-200/80 py-14 md:py-16 dark:border-white/[0.06]';

export const marketingEyebrow =
  'text-[11px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase dark:text-[#7ec5ff]';

export const marketingEyebrowPill =
  'inline-flex items-center rounded-full border border-[#2490ed]/25 bg-[#eef7ff] px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-[#146fc2] uppercase dark:border-[#2490ed]/30 dark:bg-[#2490ed]/10 dark:text-[#7ec5ff]';

export const marketingEyebrowAmber =
  'text-[11px] font-semibold tracking-[0.18em] text-[#9a4a00] uppercase dark:text-[#ed9d24]/90';

export const marketingEyebrowEmerald =
  'text-[11px] font-semibold tracking-[0.18em] text-emerald-700 uppercase dark:text-[#34d399]';

export const marketingIconWrap =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-[#2490ed]/20 bg-[#eef7ff] text-[#146fc2] dark:border-[#2490ed]/25 dark:bg-[#2490ed]/10 dark:text-[#7ec5ff]';

export const marketingBtnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#146fc2] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(36,144,237,0.45)] transition hover:bg-[#1769b8]';

export const marketingBtnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300/90 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/85 dark:shadow-none dark:backdrop-blur-sm dark:hover:border-white/25 dark:hover:bg-white/[0.07]';

export const marketingInput =
  'h-11 w-full rounded-xl border border-slate-300/90 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#2490ed]/50 focus:ring-2 focus:ring-[#2490ed]/20 dark:border-white/10 dark:bg-[#080c14]/80 dark:text-white dark:shadow-none dark:placeholder:text-white/30 dark:focus:ring-1 dark:focus:ring-[#2490ed]/25';

export const marketingLabel =
  'mb-1.5 block text-xs font-medium tracking-wide text-slate-600 uppercase dark:text-white/70';

export const marketingPageGlow =
  'pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(36,144,237,0.1),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(36,144,237,0.07),transparent_55%)]';

export const marketingBody = 'text-base leading-relaxed text-slate-600 sm:text-lg dark:text-white/75';

export const marketingBodySm = 'text-sm leading-relaxed text-slate-600 dark:text-white/65';

export const marketingHeading =
  'text-4xl leading-[1.08] font-bold tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.06] dark:text-white';

export const marketingSectionTitle =
  'text-2xl font-bold tracking-tight text-balance text-slate-900 md:text-3xl lg:text-[2.15rem] lg:leading-tight dark:text-white';

export const marketingStatCard =
  'rounded-2xl border border-slate-200/90 bg-white px-4 py-5 shadow-[0_16px_48px_-28px_rgba(15,23,42,0.12)] dark:border-white/[0.08] dark:bg-gradient-to-b dark:from-white/[0.07] dark:to-white/[0.02] dark:shadow-[0_16px_48px_-28px_rgba(0,0,0,0.8)]';

export const marketingTopicPill =
  'rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/75';

export const marketingTextStrong = 'text-slate-900 dark:text-white/90';

export const marketingTextMuted = 'text-slate-600 dark:text-white/55';

export const marketingTextSubtle = 'text-slate-600 dark:text-white/55';

export const marketingDivider = 'border-slate-200/80 dark:border-white/[0.08]';

/** Industry Hub listing pages (news, jobs, calendar, etc.) */
export const marketingHubCard = `${marketingPanel} ${marketingPanelHover}`;

export const marketingFilterPillActive =
  'rounded-full bg-[#146fc2] px-4 py-1.5 text-sm font-semibold text-white shadow-sm';

export const marketingFilterPillInactive =
  `${marketingTopicPill} px-4 py-1.5 transition hover:border-[#2490ed]/35`;

export const marketingFilterPillMutedActive =
  'rounded-full border border-slate-300/90 bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white/80';

export const marketingFilterPillMutedInactive =
  `${marketingTopicPill} px-4 py-1.5 transition hover:border-[#2490ed]/30`;

export const marketingEmptyState =
  'rounded-xl border border-dashed border-slate-300/90 bg-slate-50/50 p-12 text-center dark:border-white/10 dark:bg-white/[0.02]';

export const marketingHubCtaBanner =
  `${marketingPanel} flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6`;

export const marketingHubPlaceholder =
  'flex flex-col gap-3 rounded-xl border border-dashed border-slate-300/90 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-white/[0.02]';

export const marketingHubSectionLabel =
  'text-[11px] font-semibold tracking-[0.18em] text-slate-600 uppercase dark:text-white/55';

export const marketingBackLink =
  'inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-800 dark:text-white/55 dark:hover:text-white/75';

export const marketingMetaCard = `${marketingPanel} p-5`;

export const marketingMetaLabel =
  'mb-1 text-[10px] font-semibold tracking-[0.16em] text-slate-600 uppercase dark:text-white/55';

export const marketingLink =
  'font-medium text-[#146fc2] underline underline-offset-2 transition hover:text-[#2490ed] dark:text-[#7ec5ff] dark:hover:text-white';

export const marketingLegalArticle = `${marketingPanel} mx-auto max-w-3xl p-6 sm:p-8 md:p-10`;

export const marketingLegalProse =
  'space-y-8 text-sm leading-relaxed text-slate-600 dark:text-white/70';

export const marketingLegalH2 = 'text-lg font-semibold text-slate-900 dark:text-white';

export const marketingLegalH3 = 'mt-4 text-base font-medium text-slate-800 dark:text-white/90';

export const marketingArticleProse =
  'prose prose-slate max-w-none prose-headings:font-semibold prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:leading-relaxed prose-a:text-[#146fc2] prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-900 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-blockquote:border-l-[#2490ed] prose-blockquote:text-slate-600 prose-hr:border-slate-200 dark:prose-invert dark:prose-headings:text-white dark:prose-p:text-white/70 dark:prose-strong:text-white/90 dark:prose-code:bg-white/[0.06] dark:prose-blockquote:text-white/50 dark:prose-hr:border-white/[0.06]';
