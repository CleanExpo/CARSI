# Module 6 (drafted in full) — Break-even + Your Chargeable-Hour Rate

> **STATUS: DRAFT — accountant review required. Figures cited to `research-and-figures.md`;
> the worked overhead figures are *illustrative* and are replaced by the owner's real P&L
> (imported or entered). Nothing here is invented as fact.**
>
> **Disclaimer:** Educational information only, not financial or tax advice. Confirm every
> figure with a registered tax agent/accountant before relying on it. Full disclaimer in
> `course-overview.md`.

**Learning outcome:** combine your fully-loaded labour cost (Module 3) with your overheads to
calculate your **break-even** and the **chargeable-hour rate** you must actually charge to cover costs
and hit your target margin.

**Carried forward from Module 3 (worked example):** true labour cost = **$76.13 per billable hour**,
on **1,082 billable hours/year** for one restoration technician.

---

## 6.1 The idea: spread every cost across the hours you can bill

Module 3 gave you the labour cost per billable hour. But wages aren't your only cost. Insurance,
vehicles, fuel, equipment, software, accounting, marketing, training and premises all have to be paid
whether or not a job runs — and every one of them has to be recovered across the **same limited
billable hours**. Then, and only then, do you add profit.

The formula (used by AU trade charge-out models — Lucrature, 2026):

```
Chargeable rate (ex GST)
  = (labour cost per billable hr + overhead per billable hr) ÷ (1 − target margin%)
  + risk loading
```

Note it's **÷ (1 − margin)**, not **× (1 + margin)**. This is the single most misunderstood point in
pricing (Module 1 covered margin vs markup). A 20% *margin* means 20% of the *price* is profit — you
divide by 0.80. A 20% *markup* just adds 20% to cost and leaves you a thinner ~16.7% margin. Owners who
mark up when they mean margin quietly undercharge every job.

---

## 6.2 Step 1 — Total your annual overheads

Overheads are the costs you carry regardless of any single job. Pull these from your P&L (the
calculator imports them from Xero/QuickBooks/MYOB and maps them for you — see
`pricing-calculator-spec.md`). Illustrative figures for a small, single-technician NSW restoration
business, drawn from the ranges in `research-and-figures.md`:

| Overhead (annual) | Amount | Basis / source (§ = research-and-figures.md) |
| --- | --- | --- |
| Insurance package (PL + PI + business/asset) | $3,500 | Small 1–5 staff combined $1,600–$3,800/yr (§8) |
| Vehicle + fuel + rego + maintenance (1 work ute) | $10,000 | Fuel ~$6k (diesel ~191 c/L, §9) + running costs |
| Equipment (depreciation, maintenance, test & tag) | $6,000 | Owned-equipment model (§9) |
| Software (Xero Grow $900 + RestoreAssist `[NEEDS CURRENT FIGURE]` + QBO/MYOB) | $2,700 | Xero §7; RestoreAssist price TBC |
| Accounting + bookkeeping + BAS + annual return | $6,000 | Bookkeeping + BAS + company return (§7) |
| Marketing / website / advertising | $4,000 | Overhead (owner-set) |
| IICRC/CARSI training & certification (amortised) | $1,500 | WRT+ASD combo ~$2,350 (§9 training) amortised |
| Premises / storage | $6,000 | Storage/occupancy (owner-set) |
| **Total annual overheads** | **$39,700** | *Replace with your real P&L totals* |

> These are illustrative. The whole point of the course is that **you use your own numbers** — the
> calculator pulls these exact categories from your bookkeeping. Job **materials/consumables** are
> handled separately as a job-variable cost in Module 7, not here.

---

## 6.3 Step 2 — Overhead per billable hour

Spread overheads across the same billable hours that carry the labour:

  Overhead per billable hour = $39,700 ÷ 1,082 billable hrs = **$36.69/hr**

---

## 6.4 Step 3 — Total cost per billable hour

  Labour (Module 3) $76.13 + Overhead $36.69 = **$112.82 per billable hour**

**This is your break-even labour rate.** If you charge a client less than **$112.82/hr** for labour,
you lose money on the hour — before a cent of profit, before the owner is paid a wage from the
business. If the "market rate" you've been copying is, say, $110/hr, you are pricing **below your own
break-even** and every job digs the hole deeper.

---

## 6.5 Step 4 — Break-even for the business

Total annual cost to run the business (the number you must cover before profit):

  Fully-loaded labour $82,373.82 + Overheads $39,700 = **$122,073.82/year**

At 1,082 billable hours, break-even = $122,073.82 ÷ 1,082 = **$112.82/billable hour** (same number,
two ways). Two things move this break-even hard:

- **Utilisation.** If you only achieve **900** billable hours instead of 1,082 (a bad year, more
  travel/quoting), break-even jumps to $122,073.82 ÷ 900 = **$135.64/hr** — a 20% rate rise just to
  stand still. This is why Module 3 hammered utilisation: it's the difference between a healthy rate and
  an impossible one.
- **The workers-comp class and payroll-tax threshold** (Module 3, §4/§5): a higher WIC rate or crossing
  the payroll-tax threshold lifts labour cost and therefore break-even.

---

## 6.6 Step 5 — Add your target margin → the chargeable rate

Set a **target net margin** — the profit left after all costs, expressed as a % of price. What's
realistic for a restoration business is a question for your accountant; the course teaches you to
*set a target and price to it*, not to copy an industry number. `[Restoration net-margin benchmark
UNVERIFIED — accountant to advise a realistic target for your structure.]` We'll use **20%** to
demonstrate:

  Rate before risk = $112.82 ÷ (1 − 0.20) = $112.82 ÷ 0.80 = **$141.03/hr (ex GST)**

**Add a risk loading.** Insurance covers catastrophes but you still wear the **excess** on every claim,
plus uninsured small losses (§8). Amortise your expected annual excess/risk exposure across billable
hours — here, an illustrative **$2.00/hr**:

  Chargeable rate = $141.03 + $2.00 = **$143.03/hr (ex GST)** → round to **$145.00/hr ex GST**

**Add GST for the client-facing price** (GST 10%, §6):

  $145.00 ex GST → **$159.50 inc GST**

For insurance work (where you invoice the insurer/builder GST-exclusive and they claim the GST), quote
the **$145/hr ex GST**. For a private cash client, show **$159.50 inc GST**. The calculator shows both.

---

## 6.7 The payoff — what the numbers just told you

| Number | Value | What it means |
| --- | --- | --- |
| Wage you pay | $35.00/hr | The payslip figure |
| Fully-loaded labour / billable hr | $76.13/hr | What the tech actually costs you per chargeable hour |
| + Overhead / billable hr | $112.82/hr | **Your break-even labour rate** — charge less and you lose money |
| + 20% margin + risk | ~$145.00/hr ex GST | **Your minimum defensible charge-out rate** |
| Client price inc GST | $159.50/hr | What a private client pays |

If you'd been "matching the market" at $110/hr, you were charging **$2.82 below break-even** and
**$35 below your true rate** — losing money while fully booked. That is the exact trap this course
exists to get you out of. Your rate isn't high; it's **honest**.

---

## 6.8 Do this with your numbers

1. Total **your** annual overheads (the calculator imports them from your bookkeeping and maps them).
2. Divide by **your** billable hours (from Module 3) → overhead per billable hour.
3. Add to your labour cost per billable hour → **your break-even rate**.
4. Divide by (1 − your target margin) and add your risk loading → **your chargeable-hour rate**.
5. Show it ex and inc GST.

Carry your chargeable-hour rate into **Module 7**, where you build the full job-pricing guide
(labour + equipment + materials + margin). Then **Module 9** produces the Accountant Verification
Worksheet — because a rate this important should be signed off before you quote a single job on it.

> **Take to your accountant:** your overhead totals and categorisation, your target margin (is it
> realistic for your structure?), your risk-loading assumption, and your GST treatment for insurance
> vs private work.
