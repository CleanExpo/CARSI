# GP-491 — Levelled certification scheme (epic tracking)

Linear epic **GP-491** described an L1/L2/L3 technician ladder + public register. On `main` the **shipped product model** is the **CARSI Southern Hemisphere Restoration Designations** program (Foundation → Practitioner tiers, per DECISIONS #27–#50), not the older L1–L3 wording in the epic body.

## Canonical SSOT in repo

| Asset                | Path                                                             |
| -------------------- | ---------------------------------------------------------------- |
| Designation registry | `data/seed/designations.json`                                    |
| Typed access         | `src/lib/designations/registry.ts`                               |
| CI validation        | `npm run check:designations`                                     |
| Public verify        | `/verify/credential/[id]`, `/api/lms/credentials/[credentialId]` |

## Epic sub-issues (Linear)

| Child                   | Intent                              | Repo alignment                                                                                  |
| ----------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| P0 claims boundary      | Lock “CARSI Certified” vs VET/IICRC | Enforced by `check:iicrc-terminology` + designation copy in registry                            |
| P1 MVP register + badge | L1 technician + public register     | Partially met by designation credentials + verify URLs; **NRPG/directory** is separate (Gate 1) |

## Honest gap vs epic text

- Epic **L1/L2/L3 per discipline** maps conceptually to **Foundation / Practitioner / Advanced / Master** (see mould pathway: Level 2 foundation course → Practitioner designation exam).
- **Public register of certified firms/techs** is not fully built as the epic’s “industry register”; `/verify/*` is per-credential, not a searchable directory.
- Do **not** rename courses to IICRC discipline acronyms (DECISIONS #17, licence guards).

## Next steps

1. Phill sign-off on claims boundary (child P0) before any new “CARSI Certified Technician” marketing.
2. Link directory/NRPG work to register MVP instead of duplicating schema here.
3. Keep rebuilding Practitioner designation courses two-at-a-time (#31).
