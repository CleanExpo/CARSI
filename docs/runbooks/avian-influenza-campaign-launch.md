# Runbook — launch CARSI Avian Influenza Readiness campaign

## Day 0 checks

- Confirm official DAFF wording still matches the published campaign page.
- Confirm the Emergency Animal Disease Hotline is listed as 1800 675 888.
- Confirm CARSI support phone is correct.
- Confirm Ivi Sims has approved the campaign role wording, real headshot, LinkedIn profile link and campaign phone number 1300 654 684 before publication.
- Confirm NeoSan label/SDS if product training is promoted.
- Confirm Halo / Halosil label, SDS, Australian regulatory position, distributor/importer authority and approved organism claims before any product-specific claim. Use Halosil official pages only for manufacturer terminology until that review is complete.

## Publish order

1. CARSI hub page.
2. CARSI evidence register.
3. Free awareness course.
4. RestoreAssist documentation resource.
5. DisasterRecovery.com.au public guide.
6. NRPG member activation note.
7. LinkedIn launch post.
8. Media release.
9. Email 1.
10. Partner backlink post.

## Commands

```bash
node scripts/append-avian-influenza-courses.mjs
npm run check:iicrc-terminology
npm run lint
npm run type-check
npm run db:seed-courses -- --slug=avian-influenza-awareness-restoration-iaq-facilities
```

## Rollback

- Remove route `/avian-influenza-readiness` from deployment or revert page file.
- Remove course from `data/seed/courses-catalog.json` by slug.
- Remove social posts that contain outdated official status language.

## Monitoring

- Daily check of DAFF, Australian CDC and Animal Health Australia pages.
- Weekly review of product claim boundary.
- Record corrections publicly if facts change.


## Visual asset checks

- Replace any AI-generated portrait of Ivi Sims with an authorised real headshot.
- Store approved headshot as `public/images/people/ivi-sims-authorised-headshot.jpg` or the matching repo asset path.
- Do not publish unconfirmed direct email or phone details for Ivi Sims.
- Do not publish Halosil product images unless manufacturer/distributor asset permission is confirmed.
