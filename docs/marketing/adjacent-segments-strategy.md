# Beyond restoration technicians — the two markets CARSI is already half-built for

**Written 2026-08-26** on the founder's point that naming only restoration and carpet cleaning
bottlenecks the business. It does. The correction is not "market to more industries" — it is that
the named segments are **two different markets with two different products**, and CARSI already
owns most of the second one without a front door to it.

---

## 1. The split that changes the approach

| | **Operators** — they buy training | **Specifiers** — they buy assurance |
| --- | --- | --- |
| Who | House cleaners, maid services, rug cleaning, building maintenance | Strata management, property management, real estate, government |
| What they need | Their people to be capable and provable | To hire someone who will not create a liability |
| What they buy | Course seats, then memberships | A shortlist they can defend to an owner, a board, or an auditor |
| The CARSI product | The catalogue | The **employer proof-pack** and the **NRPG directory** |
| What "authority" means to them | Is this training any good | Can I show my committee why I picked this firm |

A specifier will never buy a course. Selling one to them fails, and that failure reads as "the
segment doesn't work" when the offer was simply aimed at the wrong job.

**This is the bottleneck, precisely stated:** every current surface speaks to the person who does
the work. The person who *chooses* who does the work has budget, recurring need, and almost no
reason to visit carsi.com.au today.

## 2. Coverage measured 2026-08-26, not estimated

Counted across `app/` and `src/components/`:

| Segment | Surfaces mentioning it |
| --- | --- |
| Facilities | 24 |
| Strata | 5 |
| Property management | 5 |
| Real estate | 2 |
| Rug cleaning | 1 |
| **Building maintenance** | **0** |
| **House cleaners** | **0** |
| **Maid services** | **0** |

Three segments the founder named have no surface at all. Facilities is comparatively well served
and is the proof that this works when someone builds for it.

## 3. The specifier product mostly exists already

This is the part worth acting on first, because the build is small and the assets are done:

- **The employer proof-pack shipped** (`/dashboard/student/credentials`, plus a 30-day public
  share link at `/verify/training-record`). Its own strategy note describes it as "suitable for HR
  or insurer evidence". A strata manager asking a contractor "show me your people are trained"
  currently has no idea this exists — the pack is built and unadvertised.
- **Public credential verification exists** at `/verify/credential/<id>`, no login required. That
  is exactly what a specifier needs: check a claim without an account.
- **A government asset is already live** — `public/downloads/carsi-government-contractor-guide.pdf`,
  "How to Get on Government Restoration Panels", captured through `/api/lead-magnet`. That is the
  template for every other specifier segment and it is being used for one.
- **The NRPG directory is BACKLOG row 12**, the next agent-actionable row. It is the specifier
  product: real listings only, free for CARSI-trained firms. Row 12's value is far higher read
  this way — it is not a nice-to-have listing page, it is the demand side's front door.

**`GOAL.md` already names this** as Gate 3, "insurer/strata demand side". The founder's instinct is
to pull it forward rather than invent it, and the assets above are why that is cheap.

## 4. What each segment actually worries about

Written as the question they would type, because that is what answer engines match:

- **Strata / property management** — "who is liable if the mould comes back", "what do I tell the
  owners corporation", "how do I compare two quotes when one is half the price".
- **Real estate** — "will this pass a final inspection", "how fast can this be turned around
  before settlement", "will the tenant's bond claim hold up".
- **Government** — "is this supplier on a panel", "can they evidence competency at audit",
  insurance and WHS documentation.
- **Building maintenance / facilities** — "can one supplier cover multiple sites", "what is the
  after-hours response".
- **House cleaners / maid services / rug cleaning** — these are **operators**, and their question
  is "how do I charge more than the person undercutting me". That is a training sale, and the
  answer is a credential a client recognises.

## 5. The order that compounds

1. **Give the proof-pack a front door.** A page aimed at the specifier explaining they can demand
   a training record from any contractor, with a live example. Costs almost nothing; the product
   is built.
2. **Land NRPG (row 12)** as the specifier destination, not as a directory feature.
3. **Clone the government guide** for strata and for property management. The capture route
   already exists; only the document and the landing copy are new.
4. **Then** build operator-side pages for the three zero-coverage segments, pointing at the
   catalogue.
5. **Content last, and per-question.** One piece per question in §4, each answering it completely.
   That is what earns the citation in an answer engine and the link from an association, rather
   than asking for either.

## 6. Constraints that bind every asset here

**Most of these segments are NOT restoration, so they carry no IICRC and no CEC framing at all.**
`CLAUDE.md` names the truckmount course as the exact incident where IICRC framing was templated
onto a course with no IICRC discipline. A house-cleaning or strata page must not inherit it. The
CEC approvals registry is empty, so no CEC hours may be displayed anywhere regardless.

Any claim about a standard is verified against the licensed source, never a web scrape, and
absence claims about a standard are banned outright. Run
`npm run verify:standards-claim -- "<copy>"` before any of this publishes.

Australian throughout: Australian English, AUD, metric, AEST, Australian regulators and suppliers.

## 7. What this does not solve

Reaching specifiers means reaching people who are not searching for training. The content in §5
earns inbound slowly. The fast paths — association mailing lists, strata industry bodies, council
procurement contacts — are all **external outreach and founder-only**. This document deliberately
stops at what can be built, and names the sends as the founder's.
