# Company Details Worksheet — CARSI Maintenance Company

Fill this in once. It collects every **`[COMPANY TO CONFIRM]`** specific the onboarding pack needs
(uniform, fleet, contacts, suppliers, site procedures, intervals). When a row is filled, update the
matching spot in the docs (the **Where** column lists them). When nothing remains, run the checker:

```bash
node scripts/check-company-placeholders.mjs    # lists any [COMPANY TO CONFIRM] still outstanding
```

> The company **name/identity** is already set (CARSI Maintenance Company). These are the operational
> specifics the cloud authoring environment didn't have. Fill what applies to your operation; mark
> "n/a" where it doesn't (e.g. TruckMount if you don't run one).

---

## A. Contacts & escalation
| Detail | Your value | Where |
| --- | --- | --- |
| Direct supervisor name + number | ____________________ | `checklists/staff-induction.md`, `02-risk-disruption-matrix.md` |
| After-hours / urgent contact | ____________________ | `checklists/staff-induction.md` |
| Incident / near-miss reporting process + contact | ____________________ | `checklists/staff-induction.md`, `checklists/chemical-ppe.md` |
| Child-safety / conduct concern — who & how to report | ____________________ | `checklists/staff-induction.md` |
| Maintenance / fault contact + method | ____________________ | `checklists/machinery-maintenance.md`, `checklists/vehicle-equipment-pre-start.md` |
| Standard "running late / revised arrival" comms | ____________________ | `02-risk-disruption-matrix.md` |

## B. Fleet & equipment
| Detail | Your value | Where |
| --- | --- | --- |
| Vehicle(s) / rego(s) + fleet details | ____________________ | `checklists/vehicle-equipment-pre-start.md` |
| TruckMount fit-out + hose reach (or n/a) | ____________________ | `checklists/vehicle-equipment-pre-start.md` |
| Minimum fuel / charge level before departure | ____________________ | `02-risk-disruption-matrix.md` |
| Standard spares kit (pads/brushes, fuses, fittings, key chemicals) | ____________________ | `02-risk-disruption-matrix.md` |
| Asset ID scheme (machine tags) | ____________________ | `checklists/machinery-maintenance.md` |
| Lubrication points & intervals; service schedule | ____________________ | `checklists/machinery-maintenance.md` |
| Test-and-tag provider & intervals (per state) | ____________________ | `checklists/machinery-maintenance.md` |
| Fault-report system (where faults are logged) | ____________________ | `checklists/machinery-maintenance.md` |

## C. Chemicals & PPE
| Detail | Your value | Where |
| --- | --- | --- |
| Approved chemical list + daily stock levels | ____________________ | `checklists/vehicle-equipment-pre-start.md` |
| Supplier accounts (SDS source, reorder) | ____________________ | `checklists/chemical-ppe.md`, `02-risk-disruption-matrix.md` |
| Respiratory protection stock / fit-test process | ____________________ | `checklists/staff-induction.md` |

## D. Sites & access
| Detail | Your value | Where |
| --- | --- | --- |
| Site sign-in app/book + sign-in/out process | ____________________ | `checklists/staff-induction.md`, `checklists/site-arrival.md`, `standards/professionalism-conduct.md`, `standards/site-cleanliness-security.md` |
| Site induction requirement | ____________________ | `checklists/site-arrival.md` |
| Parking rules | ____________________ | `checklists/site-arrival.md` |
| Access system (keys / cards / codes / paperwork) | ____________________ | `checklists/vehicle-equipment-pre-start.md` |

## E. People & induction
| Detail | Your value | Where |
| --- | --- | --- |
| Employment paperwork set (tax, super, bank) | ____________________ | `checklists/staff-induction.md` |
| WWC check verification — per state/territory + check requirements | ____________________ | `checklists/staff-induction.md`, `standards/site-cleanliness-security.md` |
| Uniform spec | ____________________ | `standards/professionalism-conduct.md`, `checklists/staff-induction.md` |
| ID / lanyard | ____________________ | `standards/professionalism-conduct.md`, `checklists/staff-induction.md` |

## F. WHS jurisdiction
| Detail | Your value | Where |
| --- | --- | --- |
| Operating state(s)/territory — model WHS vs **VIC OHS Act 2004**; local depot procedures | ____________________ | `checklists/chemical-ppe.md`, `checklists/machinery-maintenance.md`, `checklists/vehicle-equipment-pre-start.md` |

## G. L&D, records & cadence
| Detail | Your value | Where |
| --- | --- | --- |
| Records system (assessment + onboarding records) | ____________________ | `03-assessment-framework.md`, `checklists/staff-induction.md` |
| Refresher / re-validation interval (safety-critical modules) | ____________________ | `03-assessment-framework.md`, `04-pathways-30-60-90.md` |
| Toolbox-talk cadence | ____________________ | `05-implementation-recommendations.md` |
| SOP delivery format (app / laminated card / form) | ____________________ | `05-implementation-recommendations.md` |
| Pack owner + review date | ____________________ | `05-implementation-recommendations.md` |
| Specialist tracks (e.g. strip-and-seal lead, supervisor track) | ____________________ | `04-pathways-30-60-90.md` |

## H. Operations
| Detail | Your value | Where |
| --- | --- | --- |
| Standard start times | ____________________ | `02-risk-disruption-matrix.md` |

---

### How to apply
1. Fill the **Your value** column above.
2. Edit each **Where** file, replacing the `[COMPANY TO CONFIRM …]` marker with your value.
3. Run `node scripts/check-company-placeholders.mjs` — it should report **0 outstanding** before the
   pack is issued to staff. (It ignores this worksheet and `HANDOFF.md`, which only describe the
   markers.)
