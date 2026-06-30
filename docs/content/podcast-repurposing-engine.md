# Podcast → Marketing Video → Course Repurposing Engine

> Source: **"The Science of Property Restoration"** · RSS `https://anchor.fm/s/fb3a1a8c/podcast/rss` · **111 episodes** (verified 2026-07-01).
> Goal: turn each cleaning/restoration episode into (a) a 30–60s marketing video and (b) course material, then cross-promote — feeding the SEO/GEO/AEO authority programme (`docs/specs/2026-07-01-search-authority-geo-aeo.md`, Phase 2/3/4).
> Status: PROOF artifacts below are ready to use; the automated pipeline + publishing are founder-gated (see "Engine" + "Decisions").

---

## How one episode becomes many assets (the repurposing graph)

```
Episode (audio + show notes)
  ├─ 30–60s MARKETING VIDEO   → YouTube Short / Reel / TikTok + embedded on-site (VideoObject schema)
  ├─ COURSE / LESSON          → CARSI LMS micro-lesson or new course module (human-approved before publish)
  ├─ TRANSCRIPT PAGE          → /podcast/[slug] (PodcastEpisode + speakable schema)  ← SEO/GEO
  ├─ QUOTABLE STAT / CLAIM    → AEO citation bait (stats/quotes/sources)             ← GEO
  └─ NEWSLETTER / SOCIAL POST → cross-promote (Synthex)
```

One episode → 5+ indexed/citable/teachable assets. The standards episodes (S500/S520/S540) are the highest-value because they're evergreen + map 1:1 to IICRC CEC training.

---

## PROOF — two episodes fully repurposed (real content, from the feed)

### A. "IICRC Water Damage Restoration — S500 Standard" (13:51)
Source idea: S500 = mandatory "shall" vs suggested "should"; **three water categories** (Cat 1 sanitary → Cat 3 grossly contaminated); category drives the remediation response.

**30–60s marketing video — script + storyboard**
- **Hook (0–4s):** "Not all water damage is equal — and getting the category wrong can put lives at risk." *[B-roll: clean tap water → flooded room]*
- **Body (4–45s):**
  - "The IICRC S500 standard sorts water into **three categories**." *[motion graphic: Cat 1 / 2 / 3]*
  - "**Category 1** — clean, sanitary. **Category 2** — significant contamination. **Category 3** — grossly contaminated: sewage, rising flood water." *[icons per category]*
  - "The category decides everything — PPE, what you can dry vs discard, occupant safety." *[checklist tick animation]*
  - "And S500 separates **'shall'** (mandatory) from **'should'** (recommended) — knowing which is which is the difference between compliant and liable." *[stamp: SHALL vs SHOULD]*
- **CTA (45–60s):** "Master S500 the right way — CARSI's IICRC-aligned water restoration course. Link in bio." *[CARSI logo + URL]*
- **Caption/CTA copy:** "💧 The 3 water categories every restorer must know (IICRC S500). Get certified → carsi.com.au #waterdamage #IICRC #restoration"
- **AEO stat to surface on the page:** "IICRC S500 defines 3 water categories (1 sanitary, 2 significant, 3 grossly contaminated)."

**Course outline — "IICRC S500: Water Damage Categories & Classes" (micro-course / CEC)**
1. Why S500 exists — standard of care, "shall" vs "should".
2. The 3 water **categories** (sources, risks, deterioration over time).
3. The 4 water **classes** (evaporation load).
4. Category → response matrix (PPE, restore vs discard, occupant safety).
5. Knowledge check (required to issue the CEC certificate — ties into the #301 quiz-gating gap).

### B. "IICRC S520 — Core Principle of Mould Remediation" (15:07)
Source idea: S520 (2024) — restore to **Condition 1** (normal fungal ecology) by **physical removal**, *not* killing with chemicals; roles of the IEP vs remediator.

**30–60s marketing video — script + storyboard**
- **Hook (0–4s):** "You can't fix a mould problem by spraying it. Here's what the standard actually says." *[B-roll: spray bottle with a red ✗]*
- **Body (4–45s):**
  - "IICRC **S520** is the standard for professional mould remediation." *[title card]*
  - "The core principle: **physically remove** the contamination — don't just try to kill it with chemicals." *[remove vs spray comparison]*
  - "The goal is **Condition 1** — a normal fungal ecology, like the rest of the building." *[before/after meter]*
  - "And it takes two roles: the **IEP** who assesses, and the **remediator** who restores." *[two-person graphic]*
- **CTA (45–60s):** "Learn S520 properly — CARSI mould remediation training. carsi.com.au"
- **Caption:** "🦠 Killing mould ≠ remediating mould. What IICRC S520 really requires. #mould #S520 #IICRC #remediation"
- **AEO stat:** "IICRC S520 (2024) requires physical removal to restore Condition 1 — not chemical killing."

**Course outline — "IICRC S520: Mould Remediation Principles" (CEC)**
1. Fungal ecology & Condition 1/2/3 explained.
2. Why physical removal beats biocides.
3. IEP vs remediator — roles & independence.
4. Containment, PPE, verification of clearance.
5. Knowledge check → CEC certificate.

---

## Candidate backlog (next evergreen episodes — same template)
| Episode | Marketing-video angle | Course fit |
|---|---|---|
| IICRC **S540** Trauma & Crime Scene | "The standard behind biohazard cleanup" | Biohazard/trauma CEC module |
| **Psychrometry** for AU Water Damage | "Why drying is about *air*, not visible water — the HAT mnemonic" | Drying-science lesson |
| "**Toxic Mould** tests sending pros down the wrong path" (ASBB) | "Why one mycotoxin test misleads" — myth-buster | Mould health/testing lesson |
| **Steel Studs & Thermal Bridging** (AS 1684 / AS-NZS 4600) | "Timber vs steel framing & moisture" | Building-science lesson |
| 2026 Google Search is Changing | (CARSI-meta, not industry — skip for course) | — |

(106 more episodes in the feed — the engine processes the whole catalogue.)

---

## The Engine (system to build — scoped, not yet built)

**Stage 1 — Ingest** (autonomous): pull RSS → per-episode {title, description, transcript, duration}. Filter to cleaning/restoration topics (skip meta/tool episodes).
**Stage 2 — Idea + script extraction** (autonomous, LLM): per episode → video script/storyboard + course outline + quotable stat (as above). **Human review before anything publishes.**
**Stage 3 — Video render** (FOUNDER DECISION — tool): see decisions. Recommend **Remotion** (code/React, no avatar-consent, fully on-brand, renderable in CI) for 30–60s motion-graphic marketing videos; HeyGen avatar only if a talking-head is wanted (needs consent record + cost).
**Stage 4 — Course generation** (HUMAN-APPROVAL GATE): draft course/lesson into CARSI as **unpublished draft** → SME/founder reviews → publish. Never auto-publish an AI-generated course.
**Stage 5 — Cross-promote**: on-site embed (VideoObject schema, Phase 4) + /podcast/[slug] transcript (Phase 2) + social/newsletter (Synthex).

**Cross-repo:** CARSI = LMS + on-site embed + transcript pages. Synthex = the video-engine/render + social distribution (it already has `video-engine`, `heygen-avatar`, `client-content-studio`, `platform-content-adaptor` skills). Keep render/distribution in Synthex; keep courses + on-site SEO in CARSI.

## Guardrails (non-negotiable)
- AI-generated **courses** and **published marketing videos** are outward-facing/irreversible → **human-approval gate** before publish (founder model: fleet prepares, founder decides).
- Marketing claims must be accurate to the episode + IICRC standards (no invented stats) — every claim traces to source.
- Brand consistency (Synthex `brand-voice-enforce`).
