# Runbook — Professional Directory (NRPG) launch

**Status:** launch-readiness audit, 2026-11-02. BACKLOG #12 (owner: agents → founder gate for the
data source). Refs: GitHub #298 / GP-449, UNI-87 Track A (NRPG registry sync).

**One-line finding:** the feature is **built and launch-ready in everything the codebase controls**.
The *only* thing standing between the coming-soon gate and a live directory is **real, verified NRPG
member data** — and the rule is **real listings only, never fabricated**. This runbook records what
is in place, the single remaining gate, and the exact steps to go live when the data source exists.

---

## 1. What is already built (audit)

| Layer | File(s) | State |
| --- | --- | --- |
| Public page | `app/(public)/professional-directory/page.tsx` | ✅ Renders the coming-soon gate, or the listing grid when live **and** listings exist. Never renders fabricated rows. |
| Coming-soon UI | `src/components/marketing/professional-directory/ProfessionalDirectoryComingSoon.tsx` | ✅ Honest "not live yet" state, value props, and two CTAs (notify / submit). |
| Listing UI | `src/components/marketing/professional-directory/ProfessionalDirectoryListing.tsx` | ✅ Renders registry-backed professionals (name, business, tier, location, service areas, disciplines, certifications). |
| Data layer | `src/lib/server/professional-directory.ts` | ✅ **Fail-closed**: `getVerifiedProfessionals()` returns `[]` unless `PROFESSIONAL_DIRECTORY_LIVE=true` **and** a registry query is wired. No fallback to stub data on a live flag. |
| Test fixture | `src/lib/server/professional-directory.stub.ts` | ✅ Dev/test only; the runtime test asserts it never leaks into production. |
| SEO gating | `app/sitemap.ts`, `generateMetadata()` in the page | ✅ The page is `noindex` and omitted from the sitemap until it has verified listings (not merely when the flag is set). |
| Notify funnel | `/contact?source=professional-directory&intent=directory-notify&topic=…` | ✅ `app/(public)/contact/page.tsx` branches to a dedicated `directory-notify` variant with a tailored confirmation and captures source/topic/intent. |
| Submit funnel | `/submit/professional?source=professional-directory&intent=directory-profile` | ✅ `professional` is a valid `[type]` in `app/(public)/submit/[type]/page.tsx`; lead context flows into the form copy and the admin lead. |
| Tests | `src/lib/server/professional-directory.test.ts`, `src/lib/professional-directory-links.test.ts` | ✅ Data-layer fail-closed behaviour, honest status, sitemap/noindex gating, and **launch-funnel integrity** (both CTAs pinned to the live route contracts they depend on). |

Nothing on this page is a placeholder in the "fake it" sense — the coming-soon gate *is* the honest
product until real data exists.

## 2. The single remaining gate — real NRPG data (founder-owned)

`getVerifiedProfessionals()` has a documented hole where the registry query belongs (UNI-87 Track A):

```ts
// UNI-87 Track A: query NRPG member registry / `professionals` table here.
// Until then, never fall back to static stub data on a live flag.
return [];
```

To fill it, two things are needed and **both are founder/data decisions, not agent work**:

1. **A real data source** — the NRPG member registry (or a `professionals` table synced from it) with,
   per member: name, business name, disciplines/industries, IICRC (or other) certifications they
   actually hold, service areas, city/state, membership tier and status, and a `syncedAt` timestamp.
2. **Confirmation that each listed member consents to being listed** and the data is current.

> **Hard rule — real listings only.** No sample, seed, "example", or AI-generated member rows ever
> ship to production. The stub in `professional-directory.stub.ts` is for tests and must stay there.
> A fabricated listing of a real or invented firm is a trust-and-legal defect, not a placeholder.

## 3. Go-live runbook (when the data source exists)

1. **Wire the query.** Implement the registry read inside `getVerifiedProfessionals()` (replace the
   `return []` after the live-flag check). Map each row to `VerifiedProfessional`. Keep it
   fail-closed: on a query/connection error, return `[]` — never partial or cached fabricated data.
2. **Make the page metadata live-aware.** Today `generateMetadata()` in
   `app/(public)/professional-directory/page.tsx` returns the same `BASE_METADATA` whether or not the
   directory is live — and that object still carries the **"Professional Directory — Coming Soon"**
   title, the "in development" description and the coming-soon Open Graph text. When `status.live` is
   true it only strips the `noindex` tag, which would make **stale coming-soon copy indexable**.
   Before indexing is allowed, give `generateMetadata()` a live branch with the real launch title,
   description and OG text, and keep the coming-soon `BASE_METADATA` for the non-live path.
3. **Licence check on the mapped data.** A member's *own* IICRC certifications may be shown
   third-person (e.g. "IICRC WRT, ASD") — that is the member describing their credentials, which is
   allowed. Do **not** synthesise CARSI-course/CEC claims from directory data, and do not imply CARSI
   issues those certifications.
4. **Set the flag.** `PROFESSIONAL_DIRECTORY_LIVE=true` in the production environment.
5. **Verify the honest-status gate flips correctly.**
   - `getProfessionalDirectoryStatus()` → `{ live: true, listingCount: >0, source: 'nrpg_registry' }`
     only once real rows are returned.
   - The page renders `ProfessionalDirectoryListing`, not the coming-soon gate.
   - `generateMetadata()` drops the `noindex` robots tag **and** now serves the live launch copy from
     step 2 (not the coming-soon title/description/OG); the sitemap includes `/professional-directory`
     (covered by `src/lib/seo/sitemap-real-pages.test.ts`).
6. **Smoke-test the funnels** against the live page: "Notify me at launch" → contact confirmation;
   "Submit a professional profile" → `/submit/professional` with the directory lead context.
7. **Founder sign-off** before announcing, same as any public surface.

## 4. Rollback

Set `PROFESSIONAL_DIRECTORY_LIVE` back to unset/`false`. The **page** reverts immediately: on the
next request `status.live` is false, so it renders the `noindex` coming-soon gate and exposes no
data. The **sitemap** is not immediate — `app/sitemap.ts` exports `revalidate = 300`, so a cached
sitemap can keep `/professional-directory` for up to five minutes after the flag is cleared. The URL
resolves to the `noindex` gate in the meantime, so no listings are exposed; if the entry must drop
from the sitemap at once (e.g. a takedown), trigger an on-demand revalidation of the sitemap route
(or a deploy/CDN purge) rather than waiting out the window. Because the data layer is fail-closed, an
incident in the registry sync degrades to the honest gate, not to stale or fabricated listings.

## 5. What this audit did not change

- No real data was added (there is none to add here).
- The feature's behaviour is unchanged; this pass added the launch-funnel integrity test and this
  runbook. The go-live steps above remain gated on the founder-owned NRPG data source.
