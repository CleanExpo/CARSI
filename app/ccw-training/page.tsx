import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { CCW_COOKIE_NAME, verifyCcwAccessToken } from '@/lib/ccw/access-token';
import { CCW_MATERIALS } from '@/lib/ccw/file-registry';

import { CcwGate } from '../ccw-materials/CcwGate';
import { CcwMaterialsPanel } from '../ccw-materials/CcwMaterialsPanel';

export const metadata: Metadata = {
  title: 'CARSI × CCW — 2-Day Carpet Cleaning Workshop',
  description:
    'Two days of hands-on IICRC-aligned training for carpet cleaners, upholstery cleaners and hard-floor technicians. Run by CARSI — Cleaning and Restoration Science Institute — in partnership with Carpet Cleaners Warehouse.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

// The materials section reads the ccw_access cookie to decide whether to
// render the password gate or the download panel. Cookie-driven state must
// never be cached.
export const dynamic = 'force-dynamic';

/**
 * Hidden single-URL landing page for the 2-Day CARSI × CCW training course.
 *
 * Intentionally placed OUTSIDE the (public) route group so it does not
 * inherit PublicNavbar / PublicFooter. Set to noindex, nofollow so it does
 * not appear in search results or sitemaps — only discoverable by the
 * direct URL shared with prospective attendees.
 *
 * This page combines both the marketing landing page AND the password-gated
 * take-home materials (Participant Manual PDF + Word, CCW Product Guide).
 * Registered attendees enter the workshop password in the "Your Workshop
 * Materials" section below and the three download cards unlock in place.
 *
 * Placeholders wrapped in `{{ ... }}` (rendered amber on screen) are fields
 * Phill fills in per intake: dates, venue, price, registration email,
 * contact phone, refund policy.
 */

// CSS lives as a string so it can be rendered into a <style> tag without
// pulling in a separate module or affecting any other page's styles.
//
// Design tokens below follow an 8-based spacing scale, a unified type
// ramp, three reading widths (prose / medium / container), and consistent
// border / hover treatments. The `.ccwl` root class scopes every rule so
// nothing leaks into the rest of the site.
const STYLES = `
:root {
  --ccwl-bg: #060a14;
  --ccwl-bg-alt: #090e19;
  --ccwl-bg-card: rgba(255,255,255,0.035);
  --ccwl-bg-card-hover: rgba(255,255,255,0.055);
  --ccwl-border: rgba(255,255,255,0.08);
  --ccwl-border-strong: rgba(255,255,255,0.14);
  --ccwl-text: rgba(255,255,255,0.94);
  --ccwl-text-mid: rgba(255,255,255,0.72);
  --ccwl-text-dim: rgba(255,255,255,0.48);
  --ccwl-green: #2C5F2D;
  --ccwl-green-soft: rgba(44,95,45,0.18);
  --ccwl-green-glow: rgba(151,188,98,0.35);
  --ccwl-lime: #97BC62;
  --ccwl-clay: #B85042;
  --ccwl-gold: #E0A458;
  --ccwl-radius: 14px;
  --ccwl-radius-sm: 8px;
  --ccwl-w-prose: 640px;
  --ccwl-w-medium: 760px;
  --ccwl-w-container: 1120px;
  --ccwl-section-y: 112px;
  --ccwl-section-y-mobile: 72px;
}
.ccwl { background: var(--ccwl-bg); color: var(--ccwl-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, Helvetica, Arial, sans-serif;
  font-size: 16px; line-height: 1.65; -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale; min-height: 100vh; }
.ccwl * { box-sizing: border-box; }
.ccwl ::selection { background: var(--ccwl-green-glow); color: #fff; }
.ccwl a { color: var(--ccwl-lime); text-decoration: none; transition: color 0.15s; }
.ccwl a:hover { text-decoration: underline; }
.ccwl p { margin: 0; }
.ccwl .container { max-width: var(--ccwl-w-container); margin: 0 auto; padding: 0 24px; }
.ccwl .prose { max-width: var(--ccwl-w-prose); }
.ccwl .medium { max-width: var(--ccwl-w-medium); }

/* NAV */
.ccwl nav.ccwl-nav { position: sticky; top: 0; z-index: 50;
  background: rgba(6,10,20,0.82); backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--ccwl-border); }
.ccwl nav.ccwl-nav .inner { display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px; max-width: var(--ccwl-w-container); margin: 0 auto; gap: 24px; }
.ccwl .brand { display: inline-flex; align-items: center; gap: 12px; font-weight: 700;
  letter-spacing: 0.02em; text-decoration: none; color: var(--ccwl-text); flex-shrink: 0; }
.ccwl .brand-mark { width: 34px; height: 34px; border-radius: 9px;
  background: linear-gradient(135deg, var(--ccwl-green) 0%, var(--ccwl-lime) 100%);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 800; color: #fff;
  box-shadow: 0 4px 12px rgba(44,95,45,0.25); }
.ccwl .brand-text { font-size: 15px; line-height: 1; }
.ccwl .brand-text b { color: var(--ccwl-lime); font-weight: 800; }
.ccwl nav.ccwl-nav ul { list-style: none; display: flex; align-items: center; gap: 28px;
  margin: 0; padding: 0; }
.ccwl nav.ccwl-nav ul a { color: var(--ccwl-text-mid); font-size: 14px; font-weight: 500; }
.ccwl nav.ccwl-nav ul a:hover { color: var(--ccwl-text); text-decoration: none; }
.ccwl .nav-cta { background: var(--ccwl-green); color: #fff; padding: 10px 20px;
  border-radius: 999px; font-size: 14px; font-weight: 600; white-space: nowrap;
  flex-shrink: 0; transition: opacity 0.15s, transform 0.15s; }
.ccwl .nav-cta:hover { opacity: 0.92; text-decoration: none; transform: translateY(-1px); }
@media (max-width: 960px) { .ccwl nav.ccwl-nav ul { display: none; } }

/* HERO */
.ccwl .hero { padding: 112px 0 96px; position: relative; overflow: hidden; }
@media (max-width: 720px) { .ccwl .hero { padding: 72px 0 64px; } }
.ccwl .hero::before { content: ""; position: absolute; top: -220px; left: -180px;
  width: 640px; height: 640px; pointer-events: none;
  background: radial-gradient(circle, rgba(151,188,98,0.10) 0%, transparent 62%); }
.ccwl .hero::after { content: ""; position: absolute; bottom: -220px; right: -140px;
  width: 540px; height: 540px; pointer-events: none;
  background: radial-gradient(circle, rgba(44,95,45,0.14) 0%, transparent 62%); }
.ccwl .hero .inner { position: relative; z-index: 1; }
.ccwl .eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px;
  background: var(--ccwl-green-soft); border: 1px solid var(--ccwl-green-glow);
  border-radius: 999px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ccwl-lime); font-weight: 600; margin-bottom: 28px; }
.ccwl .eyebrow::before { content: ""; display: inline-block; width: 6px; height: 6px;
  border-radius: 50%; background: var(--ccwl-lime);
  box-shadow: 0 0 8px var(--ccwl-lime); }
.ccwl h1 { font-size: clamp(38px, 5.4vw, 64px); line-height: 1.05;
  margin: 0 0 24px; font-weight: 800; letter-spacing: -0.025em; max-width: 900px; color: var(--ccwl-text); }
.ccwl h1 .hl { color: var(--ccwl-lime); }
.ccwl .lede { font-size: clamp(17px, 1.5vw, 20px); line-height: 1.6;
  color: var(--ccwl-text-mid); max-width: var(--ccwl-w-medium); margin: 0 0 40px; }
.ccwl .hero-ctas { display: flex; flex-wrap: wrap; align-items: center;
  gap: 12px; margin-bottom: 56px; }
.ccwl .btn { display: inline-flex; align-items: center; justify-content: center;
  padding: 14px 26px; border-radius: 999px; font-size: 15px; font-weight: 600; letter-spacing: 0.01em;
  text-decoration: none; border: none; cursor: pointer; white-space: nowrap;
  transition: transform 0.15s, opacity 0.2s, border-color 0.2s, color 0.2s; }
.ccwl .btn:hover { transform: translateY(-1px); text-decoration: none; }
.ccwl .btn-primary { background: var(--ccwl-green); color: #fff;
  box-shadow: 0 6px 18px rgba(44,95,45,0.28); }
.ccwl .btn-primary:hover { opacity: 0.94; }
.ccwl .btn-secondary { background: transparent; color: var(--ccwl-text);
  border: 1px solid var(--ccwl-border-strong); }
.ccwl .btn-secondary:hover { border-color: var(--ccwl-lime); color: var(--ccwl-lime); }
.ccwl .hero-facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
  max-width: var(--ccwl-w-medium); }
.ccwl .fact { padding: 18px 20px; background: var(--ccwl-bg-card);
  border: 1px solid var(--ccwl-border); border-radius: var(--ccwl-radius); }
.ccwl .fact .n { font-size: 26px; font-weight: 800; color: var(--ccwl-lime);
  line-height: 1; margin-bottom: 6px; letter-spacing: -0.01em; }
.ccwl .fact .t { font-size: 13px; color: var(--ccwl-text-dim); line-height: 1.4; }
@media (max-width: 720px) { .ccwl .hero-facts { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 460px) { .ccwl .hero-facts { grid-template-columns: 1fr; } }

/* SECTIONS */
.ccwl section.ccwl-section { padding: var(--ccwl-section-y) 0; position: relative; }
.ccwl section.ccwl-section.alt { background: var(--ccwl-bg-alt); }
.ccwl section.ccwl-section + section.ccwl-section:not(.alt) {
  border-top: 1px solid var(--ccwl-border); }
@media (max-width: 720px) {
  .ccwl section.ccwl-section { padding: var(--ccwl-section-y-mobile) 0; }
}
.ccwl .section-head { margin-bottom: 56px; max-width: var(--ccwl-w-medium); }
.ccwl h2 { font-size: clamp(30px, 3.4vw, 44px); font-weight: 800;
  letter-spacing: -0.02em; margin: 0 0 16px; line-height: 1.12; color: var(--ccwl-text); }
.ccwl .sublede { font-size: 17px; line-height: 1.6;
  color: var(--ccwl-text-mid); max-width: var(--ccwl-w-medium); margin: 0; }
.ccwl h3 { font-size: 19px; margin: 0 0 10px; font-weight: 700;
  color: var(--ccwl-text); line-height: 1.35; letter-spacing: -0.005em; }
.ccwl .section-eyebrow { display: inline-flex; align-items: center; gap: 10px;
  font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ccwl-lime); font-weight: 700; margin-bottom: 16px; }
.ccwl .section-eyebrow::before { content: ""; width: 20px; height: 1px;
  background: var(--ccwl-lime); display: inline-block; }

/* PILLARS — 2-col desktop, 1-col mobile (clean 5x2 grid for 10 items) */
.ccwl .pillars { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
@media (max-width: 720px) { .ccwl .pillars { grid-template-columns: 1fr; } }
.ccwl .pillar { padding: 28px; background: var(--ccwl-bg-card);
  border: 1px solid var(--ccwl-border); border-radius: var(--ccwl-radius);
  transition: border-color 0.2s, transform 0.2s, background 0.2s; }
.ccwl .pillar:hover { border-color: var(--ccwl-green-glow);
  background: var(--ccwl-bg-card-hover); transform: translateY(-2px); }
.ccwl .pillar .num { display: inline-block; font-size: 11px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--ccwl-gold); font-weight: 700; margin-bottom: 14px; }
.ccwl .pillar p { color: var(--ccwl-text-mid); font-size: 15px; line-height: 1.6; }

/* DAYS */
.ccwl .days { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
@media (max-width: 860px) { .ccwl .days { grid-template-columns: 1fr; } }
.ccwl .day { background: var(--ccwl-bg-card); border: 1px solid var(--ccwl-border);
  border-radius: var(--ccwl-radius); padding: 32px; }
.ccwl .day-head { display: flex; align-items: center; gap: 14px;
  margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--ccwl-border); }
.ccwl .day-badge { background: var(--ccwl-green); color: #fff; padding: 6px 14px;
  border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; }
.ccwl .day-title { font-size: 20px; font-weight: 700; margin: 0; line-height: 1.25; }
.ccwl .day ul { list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 16px; }
.ccwl .day li { padding-left: 28px; position: relative;
  color: var(--ccwl-text-mid); font-size: 15px; line-height: 1.55; }
.ccwl .day li::before { content: ""; position: absolute; left: 0; top: 10px;
  width: 16px; height: 2px; background: var(--ccwl-lime); border-radius: 2px; }
.ccwl .day li strong { color: var(--ccwl-text); font-weight: 600;
  display: block; margin-bottom: 4px; }

/* TIERS */
.ccwl .tiers { display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 20px; align-items: stretch; }
@media (max-width: 860px) { .ccwl .tiers { grid-template-columns: 1fr; } }
.ccwl .tier { padding: 32px; background: var(--ccwl-bg-card);
  border: 1px solid var(--ccwl-border); border-radius: var(--ccwl-radius);
  display: flex; flex-direction: column;
  transition: border-color 0.2s, background 0.2s; }
.ccwl .tier:hover { border-color: var(--ccwl-green-glow); background: var(--ccwl-bg-card-hover); }
.ccwl .tier .label { display: inline-block; padding: 5px 12px; border-radius: 999px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  margin-bottom: 18px; align-self: flex-start; }
.ccwl .tier.newby .label { background: rgba(224,164,88,0.15); color: var(--ccwl-gold); border: 1px solid rgba(224,164,88,0.3); }
.ccwl .tier.intermediate .label { background: var(--ccwl-green-soft); color: var(--ccwl-lime); border: 1px solid var(--ccwl-green-glow); }
.ccwl .tier.pro .label { background: rgba(184,80,66,0.15); color: var(--ccwl-clay); border: 1px solid rgba(184,80,66,0.3); }
.ccwl .tier h3 { margin-bottom: 12px; }
.ccwl .tier p { color: var(--ccwl-text-mid); font-size: 15px; line-height: 1.6; }

/* INCLUDED — 3 x 2 grid at desktop */
.ccwl .included { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 960px) { .ccwl .included { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .ccwl .included { grid-template-columns: 1fr; } }
.ccwl .inc { display: flex; gap: 16px; padding: 22px; background: var(--ccwl-bg-card);
  border: 1px solid var(--ccwl-border); border-radius: var(--ccwl-radius);
  align-items: flex-start; transition: border-color 0.2s, background 0.2s; }
.ccwl .inc:hover { border-color: var(--ccwl-green-glow); background: var(--ccwl-bg-card-hover); }
.ccwl .inc-icon { flex-shrink: 0; width: 40px; height: 40px; border-radius: var(--ccwl-radius-sm);
  background: var(--ccwl-green-soft); border: 1px solid var(--ccwl-green-glow);
  display: flex; align-items: center; justify-content: center; font-size: 18px; }
.ccwl .inc-body { flex: 1; min-width: 0; }
.ccwl .inc h4 { margin: 0 0 6px; font-size: 15px; font-weight: 600; color: var(--ccwl-text);
  line-height: 1.35; }
.ccwl .inc p { color: var(--ccwl-text-mid); font-size: 14px; line-height: 1.55; }

/* MATERIALS (gated section) */
.ccwl .materials-wrap { max-width: var(--ccwl-w-prose); }
.ccwl .materials-status { display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700;
  padding: 7px 14px; border-radius: 999px; margin-bottom: 20px; }
.ccwl .materials-status.locked { background: rgba(224,164,88,0.12);
  color: var(--ccwl-gold); border: 1px solid rgba(224,164,88,0.3); }
.ccwl .materials-status.unlocked { background: var(--ccwl-green-soft);
  color: var(--ccwl-lime); border: 1px solid var(--ccwl-green-glow); }
.ccwl .materials-status .dot { width: 7px; height: 7px; border-radius: 50%;
  background: currentColor; box-shadow: 0 0 6px currentColor; }

/* INSTRUCTOR — avatar is a fixed-width column, top-aligned */
.ccwl .instructor { display: grid; grid-template-columns: 180px 1fr;
  gap: 40px; align-items: start;
  padding: 44px; border-radius: var(--ccwl-radius);
  background: linear-gradient(135deg, rgba(44,95,45,0.10) 0%, rgba(151,188,98,0.04) 100%);
  border: 1px solid var(--ccwl-green-glow); }
@media (max-width: 720px) {
  .ccwl .instructor { grid-template-columns: 1fr; gap: 24px;
    padding: 28px; text-align: center; }
}
.ccwl .avatar { width: 180px; height: 180px; border-radius: 50%;
  background: linear-gradient(135deg, var(--ccwl-green) 0%, var(--ccwl-lime) 100%);
  display: flex; align-items: center; justify-content: center;
  font-size: 60px; font-weight: 800; color: #fff; letter-spacing: 0.02em;
  box-shadow: 0 10px 30px rgba(44,95,45,0.35); flex-shrink: 0; }
@media (max-width: 720px) { .ccwl .avatar { margin: 0 auto; width: 140px; height: 140px; font-size: 46px; } }
.ccwl .instructor-body h3 { font-size: 24px; margin: 0 0 6px; line-height: 1.2; }
.ccwl .instructor-body .role { color: var(--ccwl-lime); font-size: 13px;
  font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 18px; }
.ccwl .instructor-body p { color: var(--ccwl-text-mid); font-size: 15px;
  line-height: 1.7; margin: 0; }
.ccwl .instructor-body p + p { margin-top: 12px; }

/* FAQ */
.ccwl .faq { display: flex; flex-direction: column; gap: 12px;
  max-width: var(--ccwl-w-medium); }
.ccwl details { background: var(--ccwl-bg-card); border: 1px solid var(--ccwl-border);
  border-radius: var(--ccwl-radius); padding: 22px 26px;
  transition: border-color 0.2s, background 0.2s; }
.ccwl details:hover { background: var(--ccwl-bg-card-hover); }
.ccwl details[open] { border-color: var(--ccwl-green-glow); background: var(--ccwl-bg-card-hover); }
.ccwl summary { cursor: pointer; font-size: 16px; font-weight: 600; list-style: none;
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px; color: var(--ccwl-text); line-height: 1.4; }
.ccwl summary::-webkit-details-marker { display: none; }
.ccwl summary::after { content: "+"; font-size: 22px; font-weight: 300;
  color: var(--ccwl-lime); line-height: 1; flex-shrink: 0;
  transition: transform 0.2s; }
.ccwl details[open] summary::after { content: "\u2212"; }
.ccwl details p { color: var(--ccwl-text-mid); font-size: 15px;
  line-height: 1.65; margin: 14px 0 0; }

/* CTA */
.ccwl .cta-block { text-align: center; padding: 88px 40px;
  border-radius: var(--ccwl-radius);
  background: linear-gradient(135deg, rgba(44,95,45,0.18) 0%, rgba(151,188,98,0.06) 100%);
  border: 1px solid var(--ccwl-green-glow); }
@media (max-width: 720px) { .ccwl .cta-block { padding: 56px 24px; } }
.ccwl .cta-block h2 { margin-bottom: 16px; }
.ccwl .cta-block p { color: var(--ccwl-text-mid); font-size: 17px; line-height: 1.6;
  max-width: 620px; margin: 0 auto 36px; }
.ccwl .cta-ctas { display: flex; flex-wrap: wrap; align-items: center;
  justify-content: center; gap: 12px; }

/* FOOTER */
.ccwl footer.ccwl-foot { padding: 56px 0 72px; border-top: 1px solid var(--ccwl-border);
  color: var(--ccwl-text-dim); font-size: 14px; line-height: 1.6; }
.ccwl footer.ccwl-foot .inner { display: grid; grid-template-columns: 1fr auto;
  gap: 24px; align-items: start; }
@media (max-width: 720px) {
  .ccwl footer.ccwl-foot .inner { grid-template-columns: 1fr; }
}
.ccwl footer.ccwl-foot .foot-meta { max-width: 520px; }
.ccwl footer.ccwl-foot .foot-meta a { color: var(--ccwl-text-mid); }
.ccwl footer.ccwl-foot .legal { display: flex; flex-wrap: wrap; gap: 20px 24px;
  justify-content: flex-end; }
@media (max-width: 720px) { .ccwl footer.ccwl-foot .legal { justify-content: flex-start; } }
.ccwl footer.ccwl-foot .legal a { color: var(--ccwl-text-dim); font-size: 14px; }
.ccwl footer.ccwl-foot .legal a:hover { color: var(--ccwl-lime); }

.ccwl .tbc { background: rgba(224,164,88,0.12); border: 1px dashed rgba(224,164,88,0.4);
  color: var(--ccwl-gold); padding: 2px 8px; border-radius: 4px;
  font-size: 0.9em; font-weight: 600; white-space: nowrap; }
`;

// Placeholders Phill fills in per intake. Left as literal strings so they
// stand out visually on the page until replaced.
const REGISTER_EMAIL = '{{REGISTER_EMAIL}}';
const CONTACT_PHONE = '{{CONTACT_PHONE}}';
const NEXT_INTAKE_DATES = '{{NEXT_INTAKE_DATES}}';
const VENUE_CITY = '{{VENUE_CITY}}';
const PRICE_AUD = '{{PRICE_AUD}}';
const REFUND_POLICY = '{{REFUND_POLICY}}';

export default async function CcwTrainingLandingPage() {
  const year = new Date().getFullYear();

  // Cookie-gated materials: if a valid CCW access cookie is present we render
  // the download panel inline; otherwise we render the password form in place
  // so attendees never leave this URL.
  const cookieStore = await cookies();
  const token = cookieStore.get(CCW_COOKIE_NAME)?.value;
  const authed = await verifyCcwAccessToken(token);

  return (
    <div className="ccwl">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <nav className="ccwl-nav">
        <div className="inner">
          <a href="#top" className="brand">
            <div className="brand-mark">C</div>
            <div className="brand-text">
              CARSI <b>×</b> CCW
            </div>
          </a>
          <ul>
            <li><a href="#learn">What You&rsquo;ll Learn</a></li>
            <li><a href="#format">2-Day Format</a></li>
            <li><a href="#included">What&rsquo;s Included</a></li>
            <li><a href="#materials">Materials</a></li>
            <li><a href="#instructor">Instructor</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
          <a href="#register" className="nav-cta">Register</a>
        </div>
      </nav>

      {/* HERO */}
      <section id="top" className="hero">
        <div className="container inner">
          <span className="eyebrow">CARSI × Carpet Cleaners Warehouse — Hands-On Workshop</span>
          <h1>
            The <span className="hl">2-Day Carpet Cleaning Workshop</span> for technicians who want to charge with confidence.
          </h1>
          <p className="lede">
            Two days of hands-on, IICRC-aligned training covering carpet cleaning, upholstery cleaning, hard-floor fundamentals, stain removal chemistry, machinery maintenance and the business side of running a professional cleaning operation. Run by CARSI — Cleaning and Restoration Science Institute — in partnership with Carpet Cleaners Warehouse.
          </p>
          <div className="hero-ctas">
            <a href="#register" className="btn btn-primary">Reserve my seat →</a>
            <a href="#format" className="btn btn-secondary">See the 2-day breakdown</a>
          </div>
          <div className="hero-facts">
            <div className="fact"><div className="n">2 Days</div><div className="t">Hands-on, not a webinar</div></div>
            <div className="fact"><div className="n">10 Modules</div><div className="t">Carpet, upholstery, stains, business</div></div>
            <div className="fact"><div className="n">IICRC</div><div className="t">S100 / S300 aligned curriculum</div></div>
          </div>
        </div>
      </section>

      {/* WHAT YOU'LL LEARN */}
      <section id="learn" className="ccwl-section alt">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">The Curriculum</span>
            <h2>What you&rsquo;ll actually be able to do by Sunday evening.</h2>
            <p className="sublede">Every module is grounded in IICRC standards (S100 for carpet, S300 for upholstery) and the WoolSafe pH rules — but taught through the lens of jobs you&rsquo;ll quote on Monday morning.</p>
          </div>
          <div className="pillars">
            <div className="pillar"><span className="num">01 · Foundations</span><h3>Fibre ID &amp; Soil Science</h3><p>Identify wool, nylon, polyester, olefin, polypropylene and blends in the field. Read soil types and match chemistry before you spray.</p></div>
            <div className="pillar"><span className="num">02 · Chemistry</span><h3>pH, WoolSafe &amp; Safety</h3><p>Stay inside the WoolSafe-approved pH window on protein fibres. Rinse-neutralise, dwell times, and when to dilute versus apply neat.</p></div>
            <div className="pillar"><span className="num">03 · Carpet</span><h3>HWE &amp; Pre-Condition Protocol</h3><p>Hot-Water Extraction done right: pre-vacuum, pre-spray, agitation, dwell, extract. The CARSI 5-step CCT process, applied on live training carpet.</p></div>
            <div className="pillar"><span className="num">04 · Stains</span><h3>The 4-Test Stain Ladder</h3><p>Cheap-to-expensive stain removal without damaging the fibre: water, mild alkaline, oxidiser, reducer — test first, escalate only as needed.</p></div>
            <div className="pillar"><span className="num">05 · Upholstery</span><h3>Low-Moisture UFT Cleaning</h3><p>Fabric-safe methods for cotton, linen, wool, viscose, microfibre and blends. Colour-fastness test, dry-side vs wet-side, rinse-drying technique.</p></div>
            <div className="pillar"><span className="num">06 · Hard Floor</span><h3>Tile, Grout &amp; Hybrid Floors</h3><p>Safe-default approach for ceramic, porcelain, sealed vinyl, laminate and timber. Read the floor before you pick the pad, solution or machine.</p></div>
            <div className="pillar"><span className="num">07 · Machinery</span><h3>Maintenance That Stops Callbacks</h3><p>Daily, weekly and monthly service routines for portables, truck mounts, rotary and CRB tools. Symptoms → cause → fix cheat sheet.</p></div>
            <div className="pillar"><span className="num">08 · Business</span><h3>Quoting, Pricing &amp; Callbacks</h3><p>Price by outcome not by hour. Quote-winning scripts, callback prevention checklist, and how to defend your rate without discounting.</p></div>
            <div className="pillar"><span className="num">09 · Product</span><h3>Product Guide: CCW Chemistry</h3><p>Field decision matrix for the Carpet Cleaners Warehouse product range — pH-safe defaults by fibre and soil class, with SDS how-to.</p></div>
            <div className="pillar"><span className="num">10 · Career</span><h3>Your Path to IICRC Certification</h3><p>How the 2-day workshop maps onto the IICRC CCT, CCMT and UFT certification tracks — and what to study next to sit the exams.</p></div>
          </div>
        </div>
      </section>

      {/* 2-DAY FORMAT */}
      <section id="format" className="ccwl-section">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">The Schedule</span>
            <h2>Two days. Theory in the morning, hands-on in the afternoon.</h2>
            <p className="sublede">No death-by-PowerPoint. Every concept is reinforced on live training carpet, real upholstery panels and the same machines you&rsquo;ll use on the job.</p>
          </div>
          <div className="days">
            <div className="day">
              <div className="day-head"><span className="day-badge">Day 1</span><h3 className="day-title">Carpet &amp; Stain Removal</h3></div>
              <ul>
                <li><strong>Morning — Foundations</strong>Fibre identification, soil science, pH chemistry, WoolSafe rules and safe-default product selection.</li>
                <li><strong>Mid-morning — HWE walkthrough</strong>Pre-vacuum, pre-spray, agitation, dwell, extract. Machine setup and rinse chemistry.</li>
                <li><strong>Afternoon — Hands-on carpet</strong>Clean live training carpet using the CARSI 5-step CCT process. One-on-one feedback.</li>
                <li><strong>Late afternoon — Stain ladder</strong>Work the 4-test stain removal ladder on red wine, coffee, urine, blood, ink and tar.</li>
                <li><strong>Evening — Networking</strong>Debrief with the cohort and peer contractors. Share jobs, ask questions, swap war stories.</li>
              </ul>
            </div>
            <div className="day">
              <div className="day-head"><span className="day-badge">Day 2</span><h3 className="day-title">Upholstery, Hard Floor &amp; Business</h3></div>
              <ul>
                <li><strong>Morning — Upholstery chemistry</strong>Fabric identification, colour-fast test, dry-side vs wet-side, rinse-drying.</li>
                <li><strong>Mid-morning — Hands-on fabric</strong>Clean cotton, wool, viscose and microfibre panels using low-moisture UFT methods.</li>
                <li><strong>Afternoon — Hard-floor basics</strong>Tile and grout, sealed vinyl, laminate and timber — pick the pad, solution and machine.</li>
                <li><strong>Mid-afternoon — Machinery maintenance</strong>Daily, weekly and monthly service. Troubleshoot a machine that won&rsquo;t vacuum-lock.</li>
                <li><strong>Late afternoon — Business clinic</strong>Quoting, pricing, callback prevention and defending your rate. Take-home access to the CARSI participant materials.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section id="who" className="ccwl-section alt">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">Who It&rsquo;s For</span>
            <h2>Three experience tiers, one workshop — taught side-by-side.</h2>
            <p className="sublede">The curriculum is layered. New techs lock in the fundamentals. Mid-career operators sharpen pricing and stain-removal judgement. Experienced pros get the business and machinery-maintenance edges that compound over years.</p>
          </div>
          <div className="tiers">
            <div className="tier newby"><div className="label">Newby</div><h3>0–12 months in the industry</h3><p>You&rsquo;ve cleaned a few houses, you know one-or-two ways to handle most jobs, and you want a solid framework before you develop bad habits. You&rsquo;ll leave with the 5-step CCT process, a fibre-ID routine and a stain ladder you can run any day.</p></div>
            <div className="tier intermediate"><div className="label">Intermediate</div><h3>1–5 years, growing the book</h3><p>You can clean, but you lose jobs on price and occasionally get callbacks. You&rsquo;ll sharpen chemistry judgement, tighten your quoting scripts, and learn when escalating up the stain ladder makes you money versus when it costs you.</p></div>
            <div className="tier pro"><div className="label">Pro</div><h3>5+ years, running a crew</h3><p>You&rsquo;ve seen most jobs. You want the business-side edges: machinery maintenance that eliminates callbacks, IICRC certification path for staff, and the WoolSafe / pH refresher so you can train your team to your standard.</p></div>
          </div>
        </div>
      </section>

      {/* INCLUDED */}
      <section id="included" className="ccwl-section">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">What&rsquo;s Included</span>
            <h2>Everything you need — during and after the workshop.</h2>
          </div>
          <div className="included">
            <div className="inc">
              <div className="inc-icon" aria-hidden="true">📖</div>
              <div className="inc-body">
                <h4>CARSI Participant Manual</h4>
                <p>40-page take-home manual covering all 10 modules. Delivered as PDF and editable Word doc.</p>
              </div>
            </div>
            <div className="inc">
              <div className="inc-icon" aria-hidden="true">📋</div>
              <div className="inc-body">
                <h4>CARSI × CCW Product Guide</h4>
                <p>Field decision matrix for Carpet Cleaners Warehouse chemistry — WoolSafe-checked pH windows, SDS how-to.</p>
              </div>
            </div>
            <div className="inc">
              <div className="inc-icon" aria-hidden="true">🛠️</div>
              <div className="inc-body">
                <h4>Hands-On Practice</h4>
                <p>Live training carpet, upholstery panels and hard-floor stations. You clean, we coach.</p>
              </div>
            </div>
            <div className="inc">
              <div className="inc-icon" aria-hidden="true">🧑‍🏫</div>
              <div className="inc-body">
                <h4>Peer Cohort &amp; Networking</h4>
                <p>Meet contractors across Newby / Intermediate / Pro tiers. Referrals happen here.</p>
              </div>
            </div>
            <div className="inc">
              <div className="inc-icon" aria-hidden="true">🔒</div>
              <div className="inc-body">
                <h4><a href="#materials">Secure Materials Portal</a></h4>
                <p>Password-gated downloads below — re-download any time for 12 months.</p>
              </div>
            </div>
            <div className="inc">
              <div className="inc-icon" aria-hidden="true">🏆</div>
              <div className="inc-body">
                <h4>CARSI Completion Certificate</h4>
                <p>Signed CARSI certificate confirming attendance and the modules completed.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MATERIALS (GATED) */}
      <section id="materials" className="ccwl-section alt">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">Participant Access</span>
            <h2>Your Workshop Materials.</h2>
            <p className="sublede">
              Three take-home files for registered workshop attendees: the CARSI Participant Manual (PDF + Word) and the CARSI × CCW Product Guide. Enter the workshop password you received on Day 1 to unlock the downloads.
            </p>
          </div>
          <div className="materials-wrap">
            <div className={`materials-status ${authed ? 'unlocked' : 'locked'}`}>
              <span className="dot" aria-hidden="true" />
              {authed ? 'Access Granted' : 'Password Required'}
            </div>
            {authed ? <CcwMaterialsPanel materials={[...CCW_MATERIALS]} /> : <CcwGate />}
          </div>
        </div>
      </section>

      {/* INSTRUCTOR */}
      <section id="instructor" className="ccwl-section">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">Your Instructor</span>
            <h2>Taught by a working trainer — not a presenter.</h2>
          </div>
          <div className="instructor">
            <div className="avatar" aria-hidden="true">PM</div>
            <div className="instructor-body">
              <h3>Phill McGurk</h3>
              <div className="role">Lead Instructor — CARSI</div>
              <p>Phill runs CARSI&rsquo;s professional training program and has spent his career in the cleaning and restoration industry — cleaning carpets, rebuilding post-water-damage jobs, training technicians and building product references for the trade.</p>
              <p>The 2-Day Workshop pulls from the same IICRC curriculum Phill has used to train his own crews, filtered down to the parts that actually move the needle on real jobs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="ccwl-section alt">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">Frequently Asked</span>
            <h2>Answers before you book.</h2>
          </div>
          <div className="faq">
            <details><summary>Does this workshop give me an IICRC certificate?</summary><p>No — IICRC certification (CCT, CCMT, UFT) is awarded only after sitting the IICRC exam. Our curriculum is <em>aligned</em> with the IICRC standards so you leave workshop-ready to sit CCT, and we show you the path to the exam. You&rsquo;ll receive a signed CARSI completion certificate for attending.</p></details>
            <details><summary>I&rsquo;ve been cleaning for 15 years — is this too basic?</summary><p>No. The curriculum runs three tiers (Newby / Intermediate / Pro) in parallel. Experienced operators get the business-side edges, machinery maintenance, IICRC certification pathway and the WoolSafe / pH refresher — plus the networking value of being in the room with other serious technicians.</p></details>
            <details><summary>What do I need to bring?</summary><p>Closed-toe shoes, clothes you don&rsquo;t mind getting wet, a notebook if you take hand-written notes, and your curiosity. All cleaning equipment, chemistry, training carpet, upholstery panels and take-home materials are provided.</p></details>
            <details><summary>Do I keep the take-home materials after the workshop?</summary><p>Yes. The CARSI Participant Manual (PDF + Word) and the CARSI × CCW Product Guide are yours to keep. You get password-gated download access from the <a href="#materials">Materials section above</a> for 12 months — download them again any time.</p></details>
            <details><summary>Can I send a team member instead of attending myself?</summary><p>Yes. Each seat is per-person but transferable within your business up to 7 days before the intake starts. Email <span className="tbc">{REGISTER_EMAIL}</span> with your substitution.</p></details>
            <details><summary>What&rsquo;s the refund policy?</summary><p><span className="tbc">{REFUND_POLICY}</span></p></details>
          </div>
        </div>
      </section>

      {/* REGISTER / CTA */}
      <section id="register" className="ccwl-section">
        <div className="container">
          <div className="cta-block">
            <h2>Reserve your seat for the next intake.</h2>
            <p>
              Next intake: <span className="tbc">{NEXT_INTAKE_DATES}</span> · Venue:{' '}
              <span className="tbc">{VENUE_CITY}</span> · Investment:{' '}
              <span className="tbc">{PRICE_AUD}</span> (GST inclusive) · Seats are limited to keep the hands-on ratio high.
            </p>
            <div className="cta-ctas">
              <a
                href={`mailto:${REGISTER_EMAIL}?subject=CARSI%20%C3%97%20CCW%20Workshop%20Registration`}
                className="btn btn-primary"
              >
                Register via email →
              </a>
              <a href={`tel:${CONTACT_PHONE}`} className="btn btn-secondary">
                Call <span className="tbc">{CONTACT_PHONE}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="ccwl-foot">
        <div className="container inner">
          <div className="foot-meta">
            © {year} CARSI — Cleaning and Restoration Science Institute. Delivered in partnership with Carpet Cleaners Warehouse.
            <br />
            <a href="https://carsi.com.au">carsi.com.au</a> · <a href="https://ccwonline.com.au">ccwonline.com.au</a>
          </div>
          <div className="legal">
            <a href="#learn">Curriculum</a>
            <a href="#materials">Materials</a>
            <a href="#register">Register</a>
            <a href={`mailto:${REGISTER_EMAIL}`}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
