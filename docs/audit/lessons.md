# GP-567 — lessons

Appended every run exit. Newest first.

## Run 1 — 2026-09-07

**An error message that names a closed set the code does not enforce is worse than
no message.** `validate-ledger.mjs` said *"GAP requires recommended_action (rewrite |
remove | substantiate)"* while checking only that the field was non-empty. Round-2
review planted `recommended_action: "launder"` and it validated clean. The message
told every reader a check existed that did not — so the gap was invisible precisely
because it looked covered. **Enforce the vocabulary you document, or stop documenting
it.**

**A control that COUNTS its own coverage will lie the moment the thing it counts
changes.** Criterion c3 asserted "one mutant per schema rule". `status` was in
`REQUIRED_ALWAYS`, the validator rejected its absence, and no mutant ever planted it —
so the claim was false and the suite still printed OK. Adding the missing mutant fixes
today; it does not stop the next added rule from drifting the same way. The fix was to
make the suite **derive** its obligation from the validator's own exported
`REQUIRED_ALWAYS` and vocabularies, so a rule without a mutant fails the suite by
construction. Proven by adding a `provenance` field and watching it name the gap.
**Never let a control restate the list it is supposed to cover — make it read the
list.**

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

### Round 3 — 2026-09-07

**A control that infers coverage from NAMES can always be satisfied by naming.**
Round 2's fix derived its obligation from four exported field lists and matched
mutant *rule strings* with a regex. Review defeated it twice by running it: deleting
a real mutant left the suite green, because whole rule families (quote length, ISO
dates, the sidecar, feeds) were not reachable from those lists and so were uncovered
**by construction**; and a mutant kept under one name while planting a different
defect also passed, because the check read the name. The fix was to make the
validator emit a **rule id** per violation, export the registry, and discharge
coverage only when a rule is **observed firing**. Rebuilding it that way immediately
found a rule that had never had a mutant and four file-level rules never covered at
all. **Derive the obligation from the subject's own registry, and discharge it with
observed behaviour — never with a label the test file chose for itself.**

**The second time the same defect class returns, it has moved up a layer.** Round 1
was criterion-vs-recipe drift in c8. Round 3 was criterion-vs-recipe drift in c5 —
the verifier compared one number out of seven while the criterion demanded the whole
table. Fixing the instance each round is how a class survives; the durable move is to
ask what the criterion's *text* obliges and enforce all of it.

**A table whose parts do not sum to its own total is a blind spot the exact size of
the gap — and it reads as complete.** The currency sweep published 274 total lines
while its named classes summed to 253. Nobody noticed for the document's whole life,
because no check ever added the rows up, and the one row that *was* checked
reproduced perfectly. Those 21 lines turned out to assert an entirely unrecorded S500
**2026** edition. **When a measurement partitions something, assert the partition —
against the published numbers, not only against a re-derived scan, because a check
that compares your own scan to your own scan cannot see a category you forgot to
name.**

**Do not flip a licence-critical status because a reviewer argued well; record the
disagreement instead.** Round 3 argued that a GAP accreditation entry should be
JUSTIFIED, on the grounds that a sibling entry treats the same absent public register
as grounds for JUSTIFIED. The premise was wrong — one entry has a primary artefact
and lacks only public re-verification, the other has no artefact at all — but the
reviewer's misreading was itself evidence that the distinction was buried in both
entries. **The finding was real even though the conclusion was not.** Both entries now
state the distinction explicitly, and the argument is preserved verbatim in the
`conflict` sidecar the ledger has defined since day one and had never used. An
inference is not a `best_available_source`, and repository prose asserting a fact
proves only that the prose asserts it.

**A mutant that does not actually break the thing proves nothing.** Testing the new
coverage assertion, the first probe added a validator rule that also rejected the
clean base entries — so the suite went red on the clean-base property before coverage
was ever reached. It looked like a passing control test and demonstrated nothing. The
probe had to be redone with a rule the clean bases satisfy, so that only the coverage
assertion could catch it.
