# Interactive Pricing Calculator — Design Spec

> **STATUS: DRAFT — product/engineering spec for founder + accountant review. Not built.**
> The calculator is the flagship feature of the $495 costing course. It turns the course
> methodology into a tool that produces **individualised real numbers per business**.

---

## What it does (one sentence)

Takes a restoration business's **real** cost inputs — entered manually, imported from cloud
bookkeeping, or uploaded by CSV — builds them up through the course's costing model, and outputs
that business's **break-even, true chargeable-hour rate, and a job-pricing guide**, plus an
accountant-ready verification worksheet.

---

## Design principles

1. **Real numbers, never invented.** Every default/benchmark shown is cited to
   `research-and-figures.md` with an "as at" date, and every default is clearly labelled as a
   *starting suggestion the owner must replace with their own figure*.
2. **The owner's numbers win.** Imported/entered actuals always override defaults. The calculator's
   job is to *structure* the owner's data, not substitute for it.
3. **Show the working.** Every output number is expandable to reveal the inputs and formula behind
   it — because the owner has to defend these figures to a client, an insurer and an accountant.
4. **Verification is a step, not a footnote.** The final output is a worksheet built to be signed off.
5. **Stateful + revisable.** The model is saved per business so it can be revisited and re-priced
   (e.g. every 1 July when award rates change).

---

## The three input paths

The key feature the founder asked for: the owner uses **their real numbers**, via whichever path
suits them.

### Path A — Manual entry
Guided, module-by-module forms. Each field shows the cited default as a ghost value (e.g. "SG 12% —
ATO, FY2025-26") that the owner confirms or overrides. Best for a brand-new business with no
bookkeeping history, or an owner who wants to understand each number by typing it.

### Path B — Import from cloud bookkeeping (the differentiator)
RestoreAssist already has **OAuth 2.0 integrations with Xero, QuickBooks and MYOB** (see
`lib/integrations/` in the RestoreAssist repo: `xero/client.ts`, `quickbooks/client.ts`,
`myob/client.ts`, all created via `createClientForIntegration()`, with encrypted token storage in
`oauth-handler.ts` and the `Integration` model keyed by `tenantId` (Xero) / `realmId` (QuickBooks) /
`companyId` (MYOB)). The calculator reuses this connection to **pull the business's actual
Profit & Loss and expense accounts** and auto-populate the cost model.

**Important architecture note:** the existing integration clients currently **push** data (they
create ACCREC invoices in the accounting system). Pulling a P&L / expense-account report is a **new
read capability** that must be added to each client. This is a real engineering task, not an
existing feature — spec'd below.

New capability required per provider:

| Provider | Report/endpoint to add | Keyed by | Notes |
| --- | --- | --- | --- |
| Xero | `Reports/ProfitAndLoss` (Accounting API) + `Accounts` (chart of accounts, type=EXPENSE) | `tenantId` | Xero returns P&L by account for a date range; also read tracking categories |
| QuickBooks Online | `reports/ProfitAndLoss` (Reports API) + `Account` query | `realmId` | QBO P&L report is JSON row/column tree |
| MYOB | `GeneralLedger/ProfitAndLoss` (AccountRight/Business API) + expense accounts | `companyId` | MYOB report shape differs; needs its own mapper |

**Data flow:**
1. Owner connects (or reuses existing) accounting integration via the current OAuth flow.
2. Owner picks a date range (default: last completed financial year, 1 Jul–30 Jun).
3. Calculator calls the new P&L read; receives revenue + expense accounts with amounts.
4. A **category mapper** maps the business's chart-of-accounts lines onto the course cost model
   buckets (see mapping table below). Mapping is *suggested* then owner-confirmed — chart of accounts
   naming varies per business, so the owner must approve each mapping. Confirmed mappings are saved so
   next year's re-pull is one click.
5. Values pre-fill the model; owner reviews, adjusts, and proceeds.

**Category mapping (accounting P&L line → course cost-model bucket):**

| Course cost-model bucket | Typical P&L accounts it draws from |
| --- | --- |
| Direct labour (wages) | Wages & Salaries, Subcontractors |
| Labour on-costs | Superannuation, Workers Compensation, Payroll Tax, Leave/Provisions |
| Vehicle & fuel | Motor Vehicle Expenses, Fuel, Vehicle Insurance, Rego |
| Equipment | Depreciation, Equipment Hire, Repairs & Maintenance, Test & Tag |
| Consumables | Materials, Consumables, Chemicals/Antimicrobials |
| Software | Software & Subscriptions (Xero, RestoreAssist, QuickBooks, MYOB) |
| Insurance | Public Liability, Professional Indemnity, Business/Asset insurance |
| Occupancy | Rent, Storage, Utilities |
| Professional fees | Accounting, Bookkeeping, Legal |
| Marketing | Advertising, Marketing, Website |
| Training/certification | IICRC/CARSI courses, Licences |
| Other overhead | Bank fees, Office, Sundry |

Unmapped lines are surfaced to the owner ("we didn't know where to put these — you decide") so
nothing is silently dropped.

### Path C — CSV / manual bulk import
For owners not on a supported platform (or who prefer a spreadsheet): download a CSV template with
the cost-model buckets as rows, fill in annual figures, upload. Same mapping/confirmation UX as
Path B minus the API call. Also the fallback if an import fails.

---

## The cost build-up (inputs → outputs)

The calculator implements exactly the methodology taught in the modules. Pipeline:

```
INPUTS                              BUILD-UP                          OUTPUTS
─────────────────────────────────────────────────────────────────────────────
Actual/award wage per tech  ─┐
Super 12% (§1)               ├─► Fully-loaded labour cost ─┐
Leave loading 17.5% (§3)     │   per PAID hour             │
Workers comp % (state, §4)  ─┘                             │
                                                           ├─► Cost per
Paid hours/yr ─┐                                           │   BILLABLE hour
Non-billable ──┼─► Utilisation % ──► Billable hours/yr ────┘   (labour)
(travel/quote/ │
 admin/downtime)                                          
                                                           ┌─► BREAK-EVEN
Total annual overheads (§7,8,9) ──► Overhead per ─────────┤   (revenue &
  (fixed + variable, from import)   billable hour          │    billable hrs)
                                                           │
Target profit margin % (owner-set) ──────────────────────►├─► CHARGEABLE-HOUR
                                                           │   RATE (ex GST)
Risk loading (insurance excess, §8) ─────────────────────►│
                                                           └─► + GST line
Equipment: own vs hire (§9 payback) ──► Equipment day-rate ──► PRICING GUIDE
Materials + markup ──────────────────► Materials line     ──► (job build-up)
```

### Core formulae (as taught in Module 6)

```
Fully-loaded labour cost per paid hour
  = wage/hr × (1 + super% + leave-loading-on-AL% + workers-comp% + payroll-tax%*)
    (* payroll tax only if business is over the state threshold — §5; usually 0)

Utilisation %
  = billable hours ÷ paid hours
  (paid hours include the ~5–6 weeks/yr of paid leave + public holidays;
   billable hours exclude travel, quoting, admin, training, downtime)

Cost per BILLABLE hour (labour)
  = (annual fully-loaded labour cost) ÷ (annual billable hours)

Overhead per billable hour
  = total annual overheads ÷ annual billable hours (all techs)

Chargeable-hour rate (ex GST)
  = (labour cost/billable hr + overhead/billable hr) ÷ (1 − target margin%)
  + risk loading

Break-even billable hours
  = total annual costs ÷ (chargeable rate − variable cost per hr)
```

All defaults for the ghost values (12% super, 17.5% loading, 5.76% NSW cleaning workers comp, etc.)
come from `research-and-figures.md` and carry their source + "as at" date in a tooltip.

---

## Outputs

1. **Cost-per-billable-hour** for each labour class (with the full stack expandable).
2. **Break-even** — the revenue and billable hours the business must hit to cover all costs.
3. **True chargeable-hour rate** (ex GST and GST-inclusive shown side by side).
4. **Pricing guide** — a job-build-up template: labour (rate × hours) + equipment (own/hire day-rate
   × days) + materials (cost × markup) + risk loading + margin → job price ex/inc GST.
5. **Accountant Verification Worksheet** (see below).
6. **Sensitivity view** — "if utilisation drops from 65% to 55%, your rate must rise from $X to $Y" —
   because the utilisation assumption is where owners fool themselves.

---

## Accountant Verification Worksheet (the gate)

Auto-generated one-page PDF/print view. Contains:
- Every input value the owner entered/imported, with its source (manual / Xero / QBO / MYOB / CSV).
- Every rate used (super, leave loading, workers comp, payroll tax, GST, margin) **with its cited
  source and "as at" date**.
- The resulting cost-per-billable-hour, break-even, chargeable rate and target margin.
- A checklist for the accountant to tick: award/wage basis ✓, state workers-comp class ✓, payroll-tax
  threshold ✓, tax/super set-aside ✓, depreciation/asset treatment ✓, margin realistic ✓.
- The full **disclaimer** (see `course-overview.md`).
- Signature/date block for the registered tax agent or accountant.

The platform records that the worksheet was generated and the owner was prompted to verify — it does
**not** certify the numbers.

---

## Where it lives (implementation notes for engineering)

- **In CARSI**: a course-embedded interactive tool (the course is a CARSI LMS course; the calculator
  is a lesson-level interactive component + a saved per-user model). Follows the existing LMS course
  content model (`data/seed/courses-catalog.json` entry + `docs/content/costing-pricing-course/`).
- **The bookkeeping import** depends on RestoreAssist's integration layer. Two options for the founder
  to choose:
  - **(a) Reuse RestoreAssist integrations** — if the student is also a RestoreAssist customer, the
    calculator calls RestoreAssist's (to-be-added) P&L read endpoint. Cleanest for cross-sell.
  - **(b) Standalone OAuth in CARSI** — CARSI implements its own read-only Xero/QBO/MYOB OAuth (accounting
    scope, read-only) so non-RestoreAssist users can still import. More work, wider reach.
  Recommendation: ship Path A (manual) + Path C (CSV) first; add Path B import as a fast-follow, starting
  with Xero (largest AU share) via option (a). `[Founder decision — flagged, not assumed.]`
- **Read-only scope**: the P&L pull must request **read-only** accounting scope. It never writes to the
  owner's books. State this explicitly in the connect consent screen.
- **Privacy**: imported financial data is the owner's most sensitive data. Store minimally (the mapped
  bucket totals, not the raw ledger), encrypt at rest, and let the owner delete the imported model.
  Align with existing CARSI data-deletion handling.

---

## Build sequencing (recommended)

1. Manual (Path A) + CSV (Path C) + full cost build-up + outputs + verification worksheet. *This is the
   course's core value and needs no new integration work.*
2. Xero import (Path B) — add `ProfitAndLoss` + chart-of-accounts read to the Xero client; category
   mapper; owner-confirm UX.
3. QuickBooks + MYOB import — same pattern, per-provider report mappers.
4. Sensitivity view + saved-model annual re-price prompt.
