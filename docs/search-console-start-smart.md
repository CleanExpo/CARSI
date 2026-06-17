# CARSI Start Smart Search Console Handoff

Date prepared: 2026-06-16

## What was added

The CARSI Start Smart carpet cleaning business pathway is now part of the public site:

- `https://carsi.com.au/start-carpet-cleaning-business`
- `https://carsi.com.au/start-carpet-cleaning-business/no-experience`
- `https://carsi.com.au/start-carpet-cleaning-business/cleaners-adding-carpet-cleaning`
- `https://carsi.com.au/start-carpet-cleaning-business/buying-a-cleaning-business`
- `https://carsi.com.au/start-carpet-cleaning-business/equipment-before-you-buy`
- `https://carsi.com.au/start-carpet-cleaning-business/chemistry-for-beginners`
- `https://carsi.com.au/start-carpet-cleaning-business/quoting-and-pricing`
- `https://carsi.com.au/start-carpet-cleaning-business/certification-and-trust`
- `https://carsi.com.au/start-carpet-cleaning-business/service-models`

## Technical discovery

- `app/sitemap.ts` includes the hub and sub-pillar pages.
- `app/robots.ts` already exposes `https://carsi.com.au/sitemap.xml`.
- `public/llms.txt` includes the Start Smart hub and sub-pillar routes for AI crawlers.
- Each page has page metadata, canonical URLs, FAQ schema, breadcrumb schema, article schema, and internal links.

## Google Search Console submission

Google's supported paths are:

1. Submit the sitemap in Search Console:
   - Property: `https://carsi.com.au/`
   - Sitemap: `https://carsi.com.au/sitemap.xml`
2. Use URL Inspection for the hub URL first:
   - `https://carsi.com.au/start-carpet-cleaning-business`
3. Request indexing for the hub.
4. Repeat URL Inspection for the highest-value sub-pages:
   - `/no-experience`
   - `/cleaners-adding-carpet-cleaning`
   - `/buying-a-cleaning-business`
   - `/equipment-before-you-buy`

## API option

The Search Console API can submit sitemaps and inspect URLs, but it requires an authenticated Google property owner credential. If a service account or OAuth login is available, submit:

```text
https://carsi.com.au/sitemap.xml
```

## Notes

- Google indexing is a request, not a guarantee.
- The pages should be deployed before Search Console submission.
- If Search Console is not accessible from Codex, complete the final live click/API submission from a logged-in Google owner account.

## Bing / IndexNow automation

CARSI now has a production-safe IndexNow path:

1. Set `INDEXNOW_KEY` in the production environment.
2. Confirm `https://carsi.com.au/indexnow-key.txt` returns the key as plain text.
3. Run:

```bash
npm run seo:submit-indexnow -- --send
```

The script submits the core CARSI public pages, Start Smart URLs from `public/start-smart-urls.txt`, AI citation assets, `llms.txt`, and contribution pages. Use `--url /new-path` for urgent one-off URLs after publishing new pages.

Google does not provide a general-purpose instant-indexing API for normal webpages. The correct production loop is: deploy the pages, keep `https://carsi.com.au/sitemap.xml` referenced in `robots.txt`, submit or refresh the sitemap in Google Search Console, then use URL Inspection for the highest-value pages that need manual crawl nudging.
