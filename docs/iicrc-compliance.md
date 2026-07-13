# IICRC CEC-provider compliance

CARSI is accredited as an **IICRC CEC (Continuing Education Credit) provider**. It is
**not** the certifying body and does not grant IICRC certification. "Compliant" here means
compliant with the **CE Provider Program**, which is a different registration from "IICRC
Certified Firm" status, with different rights (notably logo rights — see below).

## Single sources of truth

| Concern | Source of truth | Notes |
|---|---|---|
| Current S-standard editions | `src/lib/iicrc/standards.ts` | `IICRC_STANDARDS` + `formatStandard()`. Update one entry per revision. |
| CEC-not-certification disclaimer | `src/lib/iicrc/disclaimer.ts` | `IICRC_CEC_DISCLAIMER_SHORT` / `_LONG`. Passes `check:iicrc-terminology`. |
| IICRC logo/mark | `src/components/iicrc/IicrcMark.tsx` | Gated OFF until Bucket B (registration + asset). |

### Current editions (verified first-source, iicrc.org, 2026-07-09)

- **S100** — 7th ed., 2021 (textile floor covering cleaning)
- **S500** — 5th ed., 2021 (water damage restoration)
- **S520** — 4th ed., 2024 (mould remediation)
- **S540** — 2nd ed., 2023 (trauma & crime scene) — no public references today
- **S700** — 1st ed., 2025 (fire & smoke)

The AU adoption of S500 (AS/NZS designation, published Mar-2025) is **not** asserted as a
formal AS standard number until the designation is confirmed. Reference S500:2021 in the AU
context, not a specific AS number, until then.

## Logo gate (trademark landmine — do not bypass)

The IICRC Logo may be used **only** by registered IICRC Certified Firms, using the authorised
asset. Being a CEC provider does not by itself grant logo rights; IICRC publicly names
violators (iicrc.org/invalid-firms, verified). `IicrcMark` therefore renders nothing until
**all** of the following are confirmed by the founder (Bucket B):

1. CARSI's exact IICRC registration status (Certified Firm? Approved CE Provider mark?).
2. Written permission to display the mark, and the mark's usage spec.
3. The authorised IICRC-supplied asset file (none in the repo today).

Enable by dropping the asset at `IICRC_MARK_ASSET` and setting `IICRC_MARK_ENABLED = true`.

### Placement map (apply only after the gate opens)

- Site footer (once a shared footer exists)
- Course detail pages (`app/(public)/courses/[slug]`)
- Industry landing pages (`app/(public)/industries/*`)
- Pricing / subscribe pages

## Follow-up wiring (reviewable, not in the SSOT-scaffolding PR)

These touch existing licence-critical public copy and warrant human review page-by-page:

- Replace inline S-standard mentions in public TSX with `formatStandard()` so editions render.
- Consolidate inline disclaimers onto `IICRC_CEC_DISCLAIMER_*`; add to any page/footer missing it.
- Add a provider-status block (provider ID/number + approval period) once the founder supplies it.
