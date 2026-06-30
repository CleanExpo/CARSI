# SPM Spec — CARSI Search + Answer-Engine Authority (SEO/GEO/AEO) & International Reach

> Status: DRAFT for founder acceptance · Author: Claude (SPM) · Date: 2026-07-01
> Evidence tags: [VERIFIED] = official/primary source or repo file:line · [INFERENCE] = reasoned from verified · [UNCONFIRMED] = assumption/marketing-sourced

## 1. Task being planned

- **Original request:** Make CARSI the #1 platform restoration/cleaning professionals go to before all others, and win it through search + answer engines. Discover the latest SEO/GEO/AEO requirements (sub-agent + live research, past the Jan-2026 cutoff), audit CARSI, identify everything missing, leverage under-used assets (Podcast, Industry Calendar, social/podcast links, events incl. CCW Road trip), build content/marketing machinery (video, listicles, branding, engagement), register founder Phill McGurk for E-E-A-T, and target AU/NZ/Japan/South America/UK (US deprioritised).
- **Interpreted task:** A phased authority programme: (a) technical SEO/GEO/AEO hardening, (b) E-E-A-T author identity, (c) repeatable content systems anchored on the podcast, (d) internationalisation — each ROI-ranked, with autonomous vs founder-gated work separated.
- **Target outcome:** CARSI ranks and gets *cited* (Google AI Overviews + ChatGPT/Perplexity/Gemini/Copilot) as the authoritative AU restoration-training entity, expanding to NZ/UK/JP/LATAM.
- **Non-build clarification:** This is a spec only. No production code in this command.

## 2. Current project context

- **Repo:** CleanExpo/CARSI · **Branch:** main @ b4c09a3f · **Working tree:** clean.
- **Relevant systems:** Next.js App Router (`app/` + `src/`); two schema systems — live `src/components/seo/JsonLd.tsx` (12 components, wired) and a partly-dead `src/lib/schema/*` (only Person/LocalBusiness consumed, by `/professional-directory`); `app/robots.ts`, `app/sitemap.ts`, `public/llms.txt` (10.9 KB, current); single-locale `en-AU`.
- **Known current behaviour (audit, [VERIFIED] file:line):** Organization + Website schema site-wide (`app/layout.tsx:109-110`); Course on `/courses/[slug]`; FAQPage on home + 15 industry pages; Event/JobPosting/NewsArticle/Article(speakable)/ItemList present; robots allows 8 AI bots; sitemap enumerates ~80 static + courses/pathways.
- **Unknowns:** podcast episode data shape (`${BACKEND}/api/podcasts`); whether transcripts exist; founder's domain-strategy intent (.com.au vs .com); translation budget; professional FB/IG URL (1Password items exist).

## 3. Problem statement

- **User:** AU (then NZ/UK/JP/LATAM) restoration & cleaning professionals seeking IICRC CEC training, standards, jobs, events, and industry news.
- **Pain:** They discover competitors/US sources first; CARSI's authority isn't being captured by AI answer engines that increasingly intermediate discovery.
- **Current workaround:** Direct/word-of-mouth + paid events (CCW roadshow).
- **Business impact:** Lost top-of-funnel; AI engines cite others as the canonical industry source.
- **Technical impact:** Strong foundations but concrete gaps (no founder entity, no per-episode podcast indexability, incomplete sitemap, no hreflang) cap both classic SEO and AI citation.
- **Why now:** 2026 search is answer-engine-mediated; the March-2026 Google core update made first-hand Experience + page-level authority decisive, and FAQ/HowTo rich results were retired — the rules changed and CARSI should realign.

## 4. Desired outcome

- **User-facing:** CARSI pages rank for cert/standards/CEC/jobs/events queries in target markets and are quoted in AI Overviews + LLM answers; a clear named expert (Phill McGurk) anchors trust.
- **System:** Complete, current structured-data + entity graph; full content coverage (episodes, certs); correct international annotations.
- **Success:** Measurable lifts in indexed-page count, AI share-of-voice, and citation frequency (see §15).
- **Must not happen:** Shipping deprecated markup as if it earns rich results; IP-redirect/cloaking; linking unverified founder profiles; thin programmatic pages that the page-level-authority update penalises.

## 5. Scope

### In scope
Technical SEO/GEO/AEO hardening; founder E-E-A-T Person; podcast per-episode system; programmatic cert listicles + a CEC calculator; on-site VideoObject; sitemap/freshness fixes; bot-allow completeness; hreflang/i18n architecture and the cheap English-trio rollout.

### Out of scope (this spec)
Full JP/LATAM translation production; off-site PR/backlink campaigns; Wikidata/Wikipedia entity creation (recommended, founder-run); paid media; CRM/email platform build.

### Explicit non-goals
Not chasing FAQ/HowTo rich results (deprecated); not moving to one-page-per-fan-out-query (Google says cover topics holistically); not US market work.

### Assumptions
- [INFERENCE] CARSI keeps `carsi.com.au` short-term; a global `.com` move is a separate founder decision.
- [UNCONFIRMED] Podcast backend can expose per-episode slugs + transcripts (needs verification).

### Constraints
main=prod via DO deploy-on-push; CI = type-check + build (+ E2E/a11y/unit on PR); agent can squash-merge own PRs; carsi-db firewalled locally; authed surfaces need the founder's Chrome session.

## 6. Existing capability review

| Capability | Location/source | Reusable? | Notes |
|---|---|---:|---|
| Live schema components | `src/components/seo/JsonLd.tsx` | Yes | Extend with founder Person, PodcastEpisode, VideoObject-on-lessons, Breadcrumb everywhere |
| Person/sameAs builder | `src/lib/schema/person.ts` | Yes | Already supports sameAs/knowsAbout/jobTitle/worksFor — use for founder |
| robots/sitemap | `app/robots.ts`, `app/sitemap.ts` | Yes | Add bots + dynamic content + real lastmod |
| llms.txt | `public/llms.txt` | Yes | Keep current; low-cost (engines largely ignore it [VERIFIED]) |
| Founder identity (canonical) | Synthex `AUTHOR_ENTITY` (`app/dashboard/.../EvidencePanel.tsx`) | Yes | name "Phill McGurk", LinkedIn `linkedin.com/in/phill-mcgurk`, author page `restoreassist.com.au/authors/phill-mcgurk` |
| Course/Event/Job/News/Article schema | JsonLd.tsx | Yes | Already wired; add dateModified to News |
| Synthex SEO skills | Synthex `.claude/skills/*` (google-search-console, local-seo, content) | Reference | Cross-repo know-how, not importable code |

## 7. Specialist board review

| Role | Finding | Risk | Recommendation |
|---|---|---|---|
| Product | Authority is the right wedge; podcast + certs are the compounding assets | Scope sprawl | Ship founder identity + tech hardening first (fast wins), pilot podcast pipeline |
| Architect | Two schema systems diverge (live JsonLd.tsx vs dead `organization.ts` w/ `logo1.png` vs `logo.png`) | Drift/inconsistency | Consolidate to one source of truth before extending |
| UX | Per-episode pages + cert hub improve lateral navigation (the #299 theme) | Thin pages | Each programmatic page needs genuine, first-hand content |
| Security | Public schema only; no PII beyond already-public org contact; founder sameAs are public profiles | Linking wrong profile | Only ship founder-confirmed/verified URLs |
| QA | Every schema type must pass Rich Results Test; hreflang must be reciprocal + 200 | Broken annotations | Add a schema/hreflang verification step to CI/PR checklist |
| Judge | Strong evidence, real gaps, but too big as one build | Over-commit | REDUCE SCOPE → phase it (below) |

## 8. Judge challenge

| Category | Score | Notes |
|---|---:|---|
| First-source evidence | 23/25 | 5 sourced research streams + repo audit w/ file:line; a few [INFERENCE]/[UNCONFIRMED] flagged |
| Clear user/business problem | 19/20 | Authority + AI-citation is a real, current, high-value problem |
| Reuse of existing capability | 14/15 | Extends existing schema/robots/sitemap; founder entity already defined in Synthex |
| Security/privacy safety | 14/15 | Public data; only risk is unverified profile links |
| UX clarity | 8/10 | Programmatic pages risk thinness if content isn't first-hand |
| Testability | 9/10 | Rich Results Test, hreflang validators, GSC, AI share-of-voice tooling |
| Cost/control simplicity | 4/5 | i18n + content production are heavy; must be phased |
| **Total** | **91/100** | But **as a single build it's REDUCE SCOPE** — approve Phases 0–1 for build, Phase 2 as experiment, Phases 3–5 founder-gated |

**Decision:** REDUCE SCOPE → **APPROVE BUILD for Phase 0 + Phase 1** (autonomous, high ROI), **APPROVE EXPERIMENT for Phase 2** (podcast pilot), **defer Phases 3–5** to founder decisions.

## 9. Proposed solution (phased, ROI-ranked)

### Phase 0 — Founder E-E-A-T identity · Effort S · ROI HIGHEST · AUTONOMOUS (unblocked)
Add a schema.org `Person` for Phill McGurk — `jobTitle: "Founder & Lead Instructor"`, `worksFor` CARSI `#organization`, `knowsAbout` IICRC/restoration topics, `@id: https://carsi.com.au/#founder`, `sameAs: [linkedin.com/in/phill-mcgurk, restoreassist.com.au/authors/phill-mcgurk]` (+ professional FB/IG once pulled from 1Password/confirmed) — wired into `OrganizationSchema` as `founder` and emitted standalone. Optionally a `/about` ProfilePage. [VERIFIED Person/ProfilePage are supported: developers.google.com/search/docs/appearance/structured-data/profile-page]

### Phase 1 — Technical SEO/GEO/AEO hardening · Effort M · ROI HIGH · AUTONOMOUS
1. **Bot allow-list completeness** (`robots.ts`): add `Claude-SearchBot`, `Claude-User`, `Perplexity-User`, explicit `Bingbot` (Copilot) — citation runs off search/user agents, not training bots [VERIFIED anagram/momentic]. CARSI already allows GPTBot/OAI-SearchBot/ClaudeBot/anthropic-ai/PerplexityBot/CCBot/Google-Extended/ChatGPT-User.
2. **Sitemap completeness** (`sitemap.ts`): enumerate research articles, news, jobs, calendar events (currently only courses+pathways are dynamic); use content-true `lastmod` (not deploy-pinned `STATIC_LASTMOD`).
3. **Freshness**: add `dateModified` to NewsArticle (`JsonLd.tsx:565`); ensure visible + structured dates [INFERENCE freshness ≈4.3× AI-answer presence].
4. **Breadcrumbs** on home, `/about`, all `/industries/*` (present elsewhere).
5. **Schema consolidation**: retire/align the dead `src/lib/schema/organization.ts` (logo mismatch) to one source of truth.
6. **AEO content shape** (guidelines, applied as content is touched): front-load answers, logical H2/H3, inline statistics + quotable sentences + cited sources [VERIFIED Princeton GEO paper arxiv 2311.09735: stats +32–41%, quotes +41%, sources +30%].
7. **Note (no-op cleanup):** treat existing FAQPage/HowTo as AEO-only; do not expand for Google rich results [VERIFIED deprecations: FAQ 2026-05-07, HowTo removed].

### Phase 2 — Podcast authority pipeline · Effort L · ROI HIGH (content) · EXPERIMENT (data-gated)
Per-episode route `/podcast/[slug]` with `PodcastEpisode` JSON-LD + transcript + `speakable` show-notes; clips as `Clip` on on-site `VideoObject`; quotable-stats card; episode→article→clip→newsletter repurposing. Pilot with 1–3 episodes to validate data/transcript availability before templating. Repackages the CCW roadshow + podcast into indexed, citable artifacts.

### Phase 3 — Programmatic cert listicles + CEC calculator · Effort L · ROI HIGH · FOUNDER-GATED (content/SME)
`/certifications/[cert]` template (WRT/ASD/AMRT/FSRT/OCT/CCT…) with `Course` + (AEO-only) FAQ content, hub-and-spoke internal linking; interactive **CEC-hours calculator** (backlink magnet) with a static worked example so it ranks pre-JS. Requires SME-verified cert data (cost/hours/CEC/prereqs).

### Phase 4 — On-site video system · Effort L · ROI MED-HIGH · FOUNDER-GATED (assets)
`VideoObject` on course lessons + technique explainers (3–6 min) + CCW recaps, hosted on YouTube + embedded with on-site schema (so the domain earns the citation, not just YouTube).

### Phase 5 — Internationalisation · Effort XL · ROI MED (long-horizon) · FOUNDER STRATEGIC DECISION
- **Decision gate:** domain strategy — keep `carsi.com.au` (AU-anchored) vs migrate to `carsi.com` for a global brand. Recommended global architecture (subfolders, one domain) [VERIFIED Google multi-regional]:
  `/(en-AU, x-default) · /nz/(en-NZ) · /uk/(en-GB) · /jp/(ja-JP) · /es/(es) · /br/(pt-BR)`.
- **Phase 5a (cheap):** AU→NZ→UK shared English + reciprocal hreflang + `x-default`→AU + currency/spelling/contact per locale (`generateMetadata.alternates.languages`, next-intl). [VERIFIED hreflang rules; `es-419` invalid in hreflang — use `es`]
- **Phase 5b (translation-heavy):** `es` (LATAM Spanish) → `pt-BR` (separate program) → `ja-JP` (genuine Japanese content; English won't rank [VERIFIED]).

### System / data / permission / failure / rollback
- **Data flow:** schema is generated server-side from existing course/episode/article data → emitted as JSON-LD in SSR HTML (RSC; keep content in initial HTML [VERIFIED JS render budget]).
- **Permission:** all public surfaces; no auth changes; founder profile URLs are the only sensitive input (verify before linking).
- **Failure/rollback:** every phase is an independent PR; schema additions are additive and reversible; hreflang ships behind the locale rollout, not before.

## 10. UX requirements
Entry points: footer/nav (now improved, #299), search, AI citations. Each new page needs real content + breadcrumb + canonical + OG. Calculator needs empty/loading/result/error states + a static worked example. Locale rollout needs a non-redirecting language/region selector (banner), never IP auto-swap [VERIFIED]. Accessibility: maintain the AA bar already achieved.

## 11. Technical requirements
- **Files likely to change:** `src/components/seo/JsonLd.tsx`, `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, `src/lib/schema/*` (consolidate), new `app/(public)/podcast/[slug]/`, new `app/(public)/certifications/`, course-lesson components (VideoObject), `next.config.ts` + `generateMetadata` (Phase 5).
- **DB/schema:** none for Phases 0–1; Phase 2 needs episode/transcript data (verify backend); Phase 3 needs cert data store/content.
- **Backward compat:** all additive. **Perf:** keep SSR/ISR; structured data adds negligible weight. **Observability:** add GSC + AI-share-of-voice tracking (external).

## 12. Security & privacy
Public structured data only. Only risk: linking an unverified founder profile → mitigate by shipping only confirmed URLs (LinkedIn + RestoreAssist author page are repo-sourced [VERIFIED]; FB/IG pending 1Password/founder confirm). No secrets, no PII beyond already-public org contact. No destructive ops.

## 13. Verification plan
### Static
`npm run type-check` · `npm run build` (CARSI CI gate).
### Schema
Google Rich Results Test + Schema.org validator on every changed page; confirm Organization emits `founder`; confirm PodcastEpisode/VideoObject/Breadcrumb validate.
### Sitemap/robots
Fetch `/sitemap.xml` — assert research/news/jobs/calendar URLs present with real lastmod; `curl` each new bot UA path returns 200; verify GPTBot/OAI-SearchBot/Claude-SearchBot/PerplexityBot/Bingbot/Google-Extended not 403.
### hreflang (Phase 5)
Reciprocity + single x-default + self-canonical + all alternates 200 (hreflang validator).
### UI/browser
a11y + E2E on PR; render-check new pages via founder Chrome session for authed-adjacent surfaces.
### Evidence required before "done"
Paste type-check + build output; Rich Results Test pass screenshots/JSON; sitemap diff; robots curl matrix. **Do not claim verified without running.**

## 14. Loop & stress testing
Normal: a course/episode/cert page emits valid schema. Edge: missing transcript → page still valid (omit transcript, no email rendered). Malformed: bad date → schema omits dateModified rather than emit invalid. Empty: no episodes → list renders empty state. Duplicate: re-deploy → lastmod stable, not churned. Permission: bots blocked → citation eligibility lost (the explicit thing we're testing). Regression: existing Course/Event/News schema unchanged. Human checkpoint: founder confirms profile URLs + domain strategy + cert data.

## 15. Acceptance criteria
- [ ] `OrganizationSchema` emits a valid `founder` Person (Phill McGurk, "Founder & Lead Instructor", `sameAs` confirmed URLs); passes Rich Results Test.
- [ ] `robots.ts` explicitly allows Claude-SearchBot, Claude-User, Perplexity-User, Bingbot; all return 200 (curl-verified).
- [ ] `/sitemap.xml` includes research, news, jobs, and calendar URLs with content-true `lastmod`.
- [ ] NewsArticle schema includes `dateModified`; Breadcrumb present on home, /about, /industries/*.
- [ ] Dead `src/lib/schema/organization.ts` consolidated/removed (one org-schema source; logo consistent).
- [ ] (Phase 2 pilot) ≥1 `/podcast/[slug]` page live with valid `PodcastEpisode` schema + transcript.
- [ ] `type-check` + `build` green; all changed pages pass Rich Results Test; no deprecated markup shipped as "rich-result".
- [ ] Founder-gated items (FB/IG URL, domain strategy, cert data, translation budget) recorded as decisions before their phases start.

## 16. Goal command

```text
/execute-goal Implement Phase 0 + Phase 1 of the accepted SPM spec docs/specs/2026-07-01-search-authority-geo-aeo.md (founder E-E-A-T Person + technical SEO/GEO/AEO hardening). Completion condition: OrganizationSchema emits a valid `founder` Person for Phill McGurk with confirmed sameAs; robots.ts allows the full citation-bot set (curl 200); sitemap includes research/news/jobs/calendar with real lastmod; NewsArticle has dateModified; breadcrumbs on home/about/industries; dead organization.ts consolidated. Required proof: paste `npm run type-check` + `npm run build` output, a sitemap diff, a robots curl matrix, and Rich Results Test results for changed pages. Constraints: no unrelated files changed; ship only founder-confirmed profile URLs (never guess); additive/reversible only; no secrets; stop and produce /session-handoff if blocked on the FB/IG URL, domain strategy, or podcast transcript data.
```

## 17. Implementation sequence
1. **Inspect:** confirm founder URLs (1Password FB/IG), re-read JsonLd.tsx/robots.ts/sitemap.ts. Stop if URLs unconfirmed → ship LinkedIn+author-page only.
2. **Add/modify (Phase 0):** founder Person → OrganizationSchema. Checks: Rich Results Test. Stop: schema invalid.
3. **Add/modify (Phase 1):** bots, sitemap, dateModified, breadcrumbs, schema consolidation. Checks: curl matrix, sitemap diff, type-check+build.
4. **Verify:** run the full §13 plan; paste outputs.
5. **Stress test:** §14 cases.
6. **Judge final result:** re-score; confirm no deprecated-as-rich-result markup.
7. **Session handoff:** seed below.

## 18. Session handoff seed
Planned: CARSI search/answer-engine authority programme. Phases 0–1 (founder identity + tech hardening) are autonomous and approved; Phase 2 (podcast pipeline) is a data-gated experiment; Phases 3–5 (certs, video, i18n) are founder-gated. Key files: JsonLd.tsx, robots.ts, sitemap.ts, src/lib/schema/*. Founder URLs: LinkedIn + RestoreAssist author page [VERIFIED in Synthex]; FB/IG pending 1Password. Verification: Rich Results Test + curl bot matrix + sitemap diff + type-check/build. Deferred risks: domain strategy (.com.au vs .com), translation budget, cert SME data, podcast transcript availability. Pickup: run the §16 goal command for Phases 0–1.

## 19. Final recommendation
**Proceed to implementation of Phase 0 + Phase 1** (autonomous, ~91/100, high ROI), **pilot Phase 2** on 1–3 episodes, and **bring Phases 3–5 to the founder** for the domain-strategy, content, and translation-budget decisions.

```text
SPM spec complete. Next safe action: run the Phase 0+1 /execute-goal after the founder confirms the FB/IG URL (LinkedIn + author page are already verified).
```
