# GP-567 — lessons

Appended every run exit. Newest first.

## Run 1 — 2026-09-07

**I wrote the verifier to match what I had built, not what the criterion said.**
Criterion c8 required the live banned claims filed as GAP. The verifier asserted the
accreditation entry was JUSTIFIED and never checked GAP at all — and it passed, so
nothing surfaced it. An independent reviewer reading the contract text against the
recipe caught it in one pass. **A criterion and its recipe drift silently, because
the recipe is the only half that ever runs.** When they disagree, change the
implementation; rewriting the criterion to match what was built is self-certification
wearing a green tick.

**"Not attempted" is not "unavailable".** The accreditation claim was filed
JUSTIFIED — the status reserved for when 100% verification is *unavailable* — on the
strength of my not having looked. One search settled it: IICRC publishes no register
of approved CEC providers, and directs enquirers to an address only the founder may
write to. That is genuine unavailability, and it is now *evidenced* in the entry.
The status did not change; what changed is that it is now earned. **JUSTIFIED is a
claim about the world, not about my effort.**

**The conflation underneath was the real defect.** "CARSI holds 38 approved CEC
courses" and "CARSI is an accredited provider" are different claims, and the registry
only evidences the first. Filing one entry covering both let the evidenced claim
launder the unevidenced one — and the unevidenced one is exactly what the live
marketing copy asserts. **When a claim has a strong reading and a weak reading, file
them separately, or the strong evidence silently covers the weak claim.**

**A reviewer can be right about the defect and wrong about its consequence.** The
review found the matcher bug correctly, then concluded it under-counted gaps by at
least two. It did not: all three Level-N courses exist live under hash-suffixed
slugs, so the bug mis-targeted matches rather than hiding courses — checked directly
in `sitemap.xml` before the number was left standing. Adopt the finding, verify the
inference. Accepting a wrong conclusion because the finding was right is how a
correction becomes a new error.

**A naive join reported 78 missing courses; the real number is 18.** Exact-slug
matching against a migrated catalogue counts every rename as a deletion. Filing
"78 parity gaps" would have been a false finding of exactly the class this audit
exists to catch — and it would have looked rigorous, because it came from a script.
The fix was three matchers of decreasing confidence, with the heuristic one's
scores recorded per match so a reviewer can overturn any single call. **A number
produced by code is not thereby a measurement.**

**A stale finding can be half-right, and the half that survives is the sharp half.**
GP-525 was filed when the CEC registry held zero entries. It now holds 38, so the
premise as written is false — but the two specific courses GP-525 names are still
not in the registry. Closing the ticket on "the registry isn't empty any more"
would have reintroduced the exact licence exposure it was filed for. **Re-check
the finding, not the premise.**

**Truth and permission are different axes, and collapsing them fails both ways.**
The live meta description's "IICRC CEC Accredited provider" is probably true — 38
founder-recorded approvals back it. It is also prohibited public language. Filing
it as a lie would have been a false finding; filing it as fine because it is true
would have missed the licence risk. The ledger records the fact as JUSTIFIED; the
compliance sweep records the language as a finding. Two entries, one string.

**Every guard passing is not evidence the surface is clean.** Five repo guards exit
0 while the live site serves the prohibited string. The guards scan repo source;
the string comes from live page metadata. This is not a rule gap that better
patterns would close — it is a structural limit of where the guard looks. Asking
"is this property decidable where the guard looks?" would have predicted it.

**The unversioned citation is the bigger currency problem.** The brief pointed at
S500:2021 contamination — 20 lines. The scan found 233 lines citing S500 with no
edition at all, and zero asserting 2025. A stale edition is detectable by any
future sweep; an unversioned one is invisible to all of them. **The detectable
defect was the smaller half.**

**A validator's green means nothing until you have watched it go red.** The ledger
validator was neutered with a single early `return`, and the mutant suite went from
25 passing to 25 control failures. Only then was its green worth quoting. The suite
also asserts each mutant is rejected *by its own rule*, so one over-broad rule
cannot make the whole suite vacuous.

**The sweep counted itself the moment it was committed.** `check:currency-sweep`
passed before the commit and failed immediately after: 20 lines asserting
S500:2021 became 27, because the sweep, the run record and the ledger all cite
"S500:2021" while describing the contamination. The audit had become part of the
corpus it was auditing. Both halves — the generator and the verifier — now carry
an identical `:(exclude)docs/audit/*` pathspec, because fixing only one would make
the criterion fail on a difference in the recipe rather than a change in the
catalogue. **A criterion that only runs pre-commit has not been tested in the
state it will actually live in.**

**An environment limit is not a defect, and reporting it as one is a false
finding.** `check:cec-surfaces` crashed on a missing `typescript` import. The cause
is that a git worktree carries no `node_modules` — my environment, not the repo's
code. It is recorded as NOT RUN, never as failing.
