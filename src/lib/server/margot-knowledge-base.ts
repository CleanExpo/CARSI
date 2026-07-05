/**
 * Margot's curated external knowledge base (GP-scope: "CARSI Wiki Knowledge").
 *
 * Distinct from `getAssistantCourseContextText()` (the live, DB-driven course
 * catalogue) — this is a static, version-controlled reference covering
 * industry context Margot should be able to speak to: IICRC standards/CEC,
 * the Australian Cert IV cleaning qualification, industry events, and
 * industry media. Every fact here was verified against a primary source
 * before being added — do not add unverified claims (matches the CARSI
 * course-production accuracy standard).
 *
 * Maintenance: events and "recently active" media claims age quickly.
 * Re-verify against LAST_VERIFIED before the dates below become stale —
 * treat this file like course content, not immutable code.
 */

export const KNOWLEDGE_BASE_LAST_VERIFIED = '2026-07-06';

export const MARGOT_KNOWLEDGE_BASE = `
--- IICRC (Institute of Inspection, Cleaning and Restoration Certification) ---
IICRC (iicrc.org) is a non-profit, ANSI-accredited standards development and certification body for the inspection, cleaning, and restoration industries, founded in 1972. It certifies technicians and firms globally against its own standards.

Key ANSI/IICRC standards:
- S500 — Standard and Reference Guide for Professional Water Damage Restoration (current edition: ANSI/IICRC S500:2021)
- S520 — Standard for Professional Mold Remediation
- S540 — Standard for Trauma and Crime Scene Cleanup
Full current list: iicrc.org/iicrcstandards

Core IICRC discipline certifications (acronyms used across CARSI's catalogue):
- WRT — Water Damage Restoration Technician
- ASD — Applied Structural Drying Technician
- AMRT — Applied Microbial Remediation Technician (mould)
- FSRT — Fire and Smoke Damage Restoration Technician
- OCT — Odor Control Technician
- CCT — Carpet Cleaning Technician

CEC (Continuing Education Credit): 1 CEC = 1 hour of learning. Standard technician certifications (WRT, ASD, AMRT, etc.) require 14 CEC hours every 4 years to maintain; Master-level and Inspector certifications require 14 CEC hours every 2 years. It is the certified technician's own responsibility to submit CEC documentation to IICRC and pay the annual renewal fee. CARSI courses carrying CEC value help toward this — CARSI does not issue IICRC certification itself.
Source: iicrc.org/abouttheiicrc, iicrc.org/accepted-cecs, iicrc.org/iicrcfaqs

--- Australian Cert IV Cleaning Qualification ---
The correct, official qualification is CPP40421 — Certificate IV in Cleaning (part of the Property Services Training Package on training.gov.au) — NOT "Certificate IV in Specialised Cleaning" (that name is not used on training.gov.au; if a learner uses that phrase, gently correct it).
It offers two specialisation streams:
1. Cleaning Management — operational management, staffing, quoting, planning.
2. Specialty Cleaning and Restoration — technical skills for fire/smoke/water damage cleaning and restoration, mould remediation, and decontamination of clandestine drug, trauma and crime scene sites. This is the stream most relevant to CARSI's restoration-industry audience.
Structure: minimum 14 units of competency; nominal duration 24 months full-time / 36 months part-time. No licensing or regulatory prerequisites to enrol.
RPL (Recognition of Prior Learning) is available through RTOs for applicants who can evidence current competency against the qualification's units (certificates, employer references, work samples), avoiding repeat training.
Source: training.gov.au/training/details/CPP40421

--- Australian Government / Regulator Sources ---
- Safe Work Australia (national WHS policy body): safeworkaustralia.gov.au
- WHS regulator contacts by state/territory: safeworkaustralia.gov.au/law-and-regulation/whs-regulators-and-workers-compensation-authorities-contact-information
- Hazardous Chemical Information System: hcis.safeworkaustralia.gov.au
- DAFF (biosecurity): agriculture.gov.au/biosecurity-trade
- TGA (disinfectant/sterilant claims regulation): tga.gov.au/products/other-therapeutic-good/disinfectants-and-sterilants
- Poisons Information Centre — national 24/7 hotline 13 11 26: health.gov.au/contacts/poisons-information-centre

--- Industry Events — Australian ---
- RIA Conference & Trade Show 2026 — Restoration Industry Association (Australasia). 25-27 August 2026, The Star Event Centre, Gold Coast QLD. Australasia's largest restoration industry event (~400+ professionals), trade show floor + workshops. Source: restorationindustry.org.au/events/ria-conference-trade-show
- ISSA Cleaning & Hygiene Expo 2026 — ISSA (Australian edition). 8-9 October 2026, Melbourne Convention and Exhibition Centre. Premier Australasian cleaning/facility-solutions event, includes the ISSA Excellence Awards. Source: cleaninghygieneexpo.issa.com
- ARBS 2026 — HVAC&R and Building Services event, Melbourne, May 2026, 300+ exhibitors. Adjacent field (building services), not restoration/cleaning-specific, but relevant context for facility-side learners. Source: arbs.com.au
(No verified state-specific restoration/cleaning conference beyond RIA and ISSA was found — do not invent one if asked.)

--- Industry Events — International ---
- IICRC Annual Standards Summit 2026 — 22-25 February 2026, Las Vegas USA. Primarily a standards-consensus meeting for Consensus Body members/international reps, not a general trade show. Source: iicrc.org/standards-summit
- RIA International Restoration Convention & Industry Expo 2026 — 26-29 April 2026, Savannah GA, USA. Up to 13 CE credits from RIA & IICRC. Source: convention.restorationindustry.org
- ISSA Show North America 2026 — 16-19 November 2026, Mandalay Bay, Las Vegas USA. The largest global cleaning-industry trade show (2,000+ exhibitors, 100,000+ attendees). Source: issashow.com

--- Industry Podcasts (US-based; note origin when discussing with AU learners) ---
- The Restoration & Remediation "Ask the Expert" Podcast — Restoration & Remediation Magazine (BNP Media). Active, biweekly, industry guest interviews. Spotify/Apple Podcasts.
- Restoration Pros Unplugged — hosted by Clinton James & Bobby Thomas. Active (recent episodes confirmed). Restoration business/marketing focus. Apple Podcasts.
- Restoration Today — C&R Magazine, hosted by Michelle Blevins. Weekly industry-peer interviews. Recency not fully confirmed at time of writing — mention with that caveat.
- Water Damage Restoration Masters — covers equipment, business/legal, insurance topics. Recency unconfirmed — mention with that caveat, may be dormant.
No Australian-specific restoration industry podcast was found as of this writing — say so plainly if asked, don't invent one.

--- Industry YouTube Channels ---
- @TheIICRC — IICRC's own official channel.
- Legend Brands (Dri-Eaz, Prochem, Sapphire Scientific, ODORx) — restoration equipment/training content tied to their Restoration Sciences Academy.
- Xactimate Training by Crest LLC — Xactimate estimating software training, relevant to restoration business skills.
Subscriber counts and exact upload recency were not independently confirmed for these three — do not state specific subscriber numbers unless re-verified.
`.trim();

export function getMargotKnowledgeBaseContext(): string {
  return MARGOT_KNOWLEDGE_BASE;
}
