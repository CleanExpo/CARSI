# SEO, AEO, GEO and console runbook — Australian H5 readiness campaign

## Position

This campaign must compete on authority, usefulness and clarity. It must not use fear-based copy, fabricated reviews, fabricated authorship, unsupported product claims or doorway pages.

No one can guarantee a #1 ranking. The build target is maximum eligibility: crawlability, valid structured data, strong E-E-A-T signals, answer-engine clarity, source traceability, Core Web Vitals discipline and fast indexing workflows.

## Primary URLs

- CARSI hub: https://carsi.com.au/avian-influenza-readiness
- RestoreAssist documentation: https://restoreassist.app/
- Disaster Recovery public guide: https://disasterrecovery.com.au/guides/avian-influenza-readiness
- NRPG network: https://disasterrecovery.com.au/operational-excellence/executive-partners
- Synthex agency: https://synthex.social/

## Target topic clusters

### Cluster 1 — public reporting

- bird flu hotline Australia
- dead bird reporting Australia
- sick dead bird what to do Australia
- Emergency Animal Disease Hotline bird flu

### Cluster 2 — professional restoration and IAQ

- avian influenza restoration training Australia
- H5 bird flu cleaning protocol Australia
- bird flu site documentation
- IAQ restoration biosecurity training

### Cluster 3 — facility and property management

- bird flu facility response Australia
- property manager sick dead birds advice
- strata bird flu reporting protocol
- commercial site bird flu cleaning documentation

### Cluster 4 — product and method education

- hydrogen peroxide dry fogging restoration
- Halosil HaloFogger remediation training
- clean before disinfection bird flu
- dry fogging documentation protocol

### Cluster 5 — professional network visibility

- NRPG restoration network
- Disaster Recovery professional contractors Australia
- RestoreAssist field documentation
- CARSI biosecurity readiness training

## On-page E-E-A-T requirements

- Clear publisher: CARSI.
- Marketing agency of record: Synthex.
- Named point of contact: Ivi Sims.
- Verified contact phone: 1300 654 684.
- Author/reviewer block visible on-page.
- Source last reviewed date visible on-page.
- Official-source links visible near the claims they support.
- Product claim boundary visible on-page.
- Correction policy visible on-page.
- No fake portraits or unapproved direct email.

## Structured data required

Use JSON-LD graph with:

- WebPage
- Article
- Organization for CARSI
- Organization for Synthex as agency/supporting organisation
- Person for Ivi Sims
- BreadcrumbList
- FAQPage
- Course
- ItemList for official sources

Validate with Google's Rich Results Test and Schema Markup Validator after deployment.

## AEO and GEO content requirements

Each priority answer block should directly answer a common query in 40-80 words, then provide evidence links. Keep headings in natural question form.

Recommended answer blocks:

- What should I do if I find a sick or dead bird in Australia?
- Is H5 bird flu currently a human-health emergency in Australia?
- Can restoration contractors handle sick or dead birds?
- What can IAQ and restoration professionals help with?
- Is dry fogging required for Australian H5 bird flu control measures?
- How should field work be documented?

## Lighthouse and Core Web Vitals requirements

- Keep hero image as SVG or optimised WebP/AVIF.
- Avoid large JavaScript client bundles for the static campaign page.
- Keep the page server-rendered.
- Use explicit image width/height.
- Keep external scripts off the page unless essential.
- Do not add tracking widgets that harm LCP or INP.
- Confirm mobile layout first.

## Google Search Console actions

After deployment:

1. Confirm property access for `https://carsi.com.au/`.
2. Inspect `https://carsi.com.au/avian-influenza-readiness`.
3. Request indexing.
4. Submit or resubmit `https://carsi.com.au/sitemap.xml`.
5. Check Page indexing, Experience, Enhancements and Rich results reports.
6. Add annotations in GA4/Search Console for the launch date.

## Bing Webmaster Tools actions

After deployment:

1. Confirm Bing property access.
2. Submit sitemap.
3. Submit the hub URL through URL Submission.
4. Submit IndexNow payload when the key is configured.
5. Monitor IndexNow Insights and search performance.
6. Monitor AI/Copilot citation reporting where available.

## Google Cloud / API readiness

- Keep Search Console URL Inspection API credentials out of the repo.
- Use a Google Cloud service account only if it is granted access to the Search Console property.
- Store credentials in Vercel/secret manager only.
- Do not commit service account JSON.
- Automate reporting only after manual property access is confirmed.

## IndexNow readiness

CARSI already has an IndexNow submit script in `package.json`. Confirm the production IndexNow key and key-location file before running.

Run only after the production URL is live:

```bash
npm run seo:submit-indexnow
```

## Off-page backlink targets

- Synthex case study linking to CARSI hub.
- RestoreAssist documentation article linking to CARSI hub.
- DisasterRecovery public guide linking to CARSI hub.
- NRPG member note linking to CARSI hub.
- Halosil reference only as manufacturer context, not endorsement.
- LinkedIn posts from CARSI, Synthex, Ivi Sims and partner contractors.

## Reporting cadence

Daily for first 7 days:

- Indexing status
- Search Console queries
- Bing Webmaster Tools submissions
- SERP screenshots for priority terms
- LinkedIn impressions/clicks
- Backlinks placed
- Corrections required if official guidance changes

Weekly for 30 days:

- Top queries
- CTR by title/meta test
- Rich result validation
- Lighthouse mobile check
- Content gap additions
- Backlink acquisition status
