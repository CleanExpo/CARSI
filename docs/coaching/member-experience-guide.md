# Coaching member experience (visual + support)

Members use the **Business Coaching workspace** under `/dashboard/coaching`. UX goals:

- **Scan-first layout:** hero header, stat grids, filter pills, jump nav on long pages (marketing pack).
- **Honest automation:** marketing pack and actions explain coach approval and claim-safe copy.
- **Support everywhere:** each major screen ends with `CoachingSupportPanel` or mailto to coaching support.
- **Test hooks:** `data-testid` on build buttons, stat grids, filters, empty states — see component tests under `src/components/coaching-portal/visual/` and `CoachingMarketingPackPage.test.tsx`.

## Shared components

| Component                  | Use                                     |
| -------------------------- | --------------------------------------- |
| `CoachingPageHeader`       | Eyebrow + title + description hero band |
| `CoachingStatGrid`         | KPI tiles with tone rings               |
| `CoachingFilterPills`      | Action board filters                    |
| `CoachingEmptyState`       | Zero-data states with CTA               |
| `CoachingSupportPanel`     | Tips + email coaching support           |
| `CoachingQuickLinks`       | Home shortcut grid                      |
| `CoachingFeatureSpotlight` | Promos (e.g. A7 marketing pack)         |
| `CoachingSection`          | Card sections with shared title styling |
| `CoachingWorkspaceLoading` | Coaching portal route loading shell     |

## Metadata

Browser tab titles and descriptions: `coachingRouteMetadata()` in `src/lib/coaching-portal/coaching-route-metadata.ts` (wired from each `/dashboard/coaching/*/page.tsx`).

Home shortcut grid data: `coachingHomeQuickLinks()` in `src/lib/coaching-portal/coaching-home-quick-links.ts`.

Route titles and support tips: `src/lib/coaching-portal/coaching-page-meta.ts`.

Action board metrics: `src/lib/coaching-portal/action-board-view.ts`.

Marketing pack stats/jump links: `src/lib/coaching-portal/marketing-pack/marketing-pack-view.ts`.

## Manual QA checklist

1. Home → quick links + marketing spotlight
2. Actions → stat strip + filters + proposed badge
3. Plan → header + ask coach + support
4. Marketing pack → jump nav + support footer
5. Mobile 390px — horizontal scroll on jump nav and filters only

## Tests

```bash
npm run test:unit -- \
  src/lib/coaching-portal/coaching-page-meta.test.ts \
  src/lib/coaching-portal/coaching-route-metadata.test.ts \
  src/lib/coaching-portal/coaching-home-quick-links.test.ts \
  src/lib/coaching-portal/action-board-view.test.ts \
  src/components/coaching-portal/visual \
  src/components/coaching-portal/CoachingMarketingPackPage.test.tsx
```
