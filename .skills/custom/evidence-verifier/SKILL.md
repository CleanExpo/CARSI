---
name: evidence-verifier
description: Validates that claimed evidence actually proves what is stated. Triggers when an agent presents a completion claim, screenshot, test result, or curl output as proof. Checks evidence quality, recency, relevance, and sufficiency before accepting a VERIFIED status.
license: MIT
metadata:
  author: CARSI
  version: '1.0.0'
  locale: en-AU
---

# Evidence Verifier

Validates that evidence actually proves what it claims to prove.

## Description

Evidence quality determines claim validity. A screenshot of a loading spinner does not prove a page works. A passing test suite with mocked dependencies does not prove the API works. This skill applies a 4-tier evidence standard to every completion claim and rejects insufficient evidence.

## Trigger Phrases

- When any agent presents: "here is the evidence", "proof:", "screenshot:", "test results:"
- When any agent uses: "verified", "confirmed", "working", "passing"
- When reviewing a finished audit report
- When a sub-agent returns an artefact
- "check this evidence", "is this sufficient proof?", "verify this"

## Evidence Tiers

### Tier 1 — Direct Observation (Strongest)

The system state is directly observed in real-time.

- Live browser screenshot with visible URL and timestamp
- `curl` response with headers showing actual response
- Real test run output (not cached, run just now)
- Live production log showing real traffic

### Tier 2 — Recent Artefact (Strong)

A time-stamped artefact from within the last hour.

- Screenshot with file timestamp
- CI/CD run log with timestamp
- Commit hash + test results from that commit

### Tier 3 — Historical Artefact (Weak — requires re-verification)

An artefact from more than 1 hour ago.

- Old screenshots
- Previous session's test results
- Artefacts without timestamps

### Tier 4 — Narrative Description (Not Accepted)

No artefact. An agent's description of what they believe is true.

- "The page is working correctly"
- "The tests should pass"
- "I implemented error handling"
- "The endpoint responds as expected"

**Tier 4 evidence is never accepted. Status remains UNKNOWN.**

## Procedure

### Step 1 — Classify Evidence

For each presented artefact:

```
ARTEFACT: [description]
TIER: [1 | 2 | 3 | 4]
RECENCY: [timestamp or "unknown"]
RELEVANCE: [does this prove the specific claim?]
```

### Step 2 — Check Relevance

Evidence must prove the **specific claim**, not a related claim.

| Claim                      | Acceptable Evidence                               | Not Acceptable                          |
| -------------------------- | ------------------------------------------------- | --------------------------------------- |
| "Login works"              | Screenshot of logged-in dashboard                 | Screenshot of login form                |
| "API endpoint returns 200" | `curl` output with `HTTP/1.1 200`                 | "The endpoint is configured"            |
| "Tests pass"               | Full pytest/jest output                           | "I ran the tests and they passed"       |
| "No 404 errors"            | Route scan results listing all routes with status | "I checked and it looked fine"          |
| "Payment works"            | Stripe test mode successful charge screenshot     | Stripe dashboard showing product exists |

### Step 3 — Check Recency

- Tier 1 (real-time): Always acceptable
- Tier 2 (< 1 hour): Acceptable with timestamp
- Tier 3 (> 1 hour): Flag, request re-verification
- No timestamp: Treat as Tier 3

### Step 4 — Check Sufficiency

Does the evidence fully cover the claim, or only part of it?

Example: "The app is production-ready" requires evidence across **all** categories in `memory.md > Definition of Finished`. A single passing test is not sufficient.

### Step 5 — Return Verdict

```
EVIDENCE VERDICT: ACCEPTED | INSUFFICIENT | REJECTED

SUMMARY:
- [Artefact 1]: Tier X — [accepted/rejected] — [reason]
- [Artefact 2]: Tier X — [accepted/rejected] — [reason]

GAPS:
- [What still needs to be verified]

RECOMMENDED ACTION:
- [What the agent should do to produce sufficient evidence]
```

## Common Evidence Failures

| Failure Pattern                       | Correct Response                                            |
| ------------------------------------- | ----------------------------------------------------------- |
| Agent describes what they implemented | "Describe ≠ verify. Provide curl output or screenshot."     |
| Screenshot shows loading state        | "Loading state proves nothing. Re-capture when loaded."     |
| Test output is truncated              | "Full output required. Partial results not accepted."       |
| Screenshot has no visible URL         | "URL must be visible to verify the correct endpoint."       |
| "All tests pass" without output       | "Run tests and paste full output."                          |
| Historical artefact reused            | "This evidence is [X] hours old. Re-verify."                |
| Mocked test passing                   | "Tests with mocked dependencies do not verify integration." |

## Validation Gates

- [ ] Every VERIFIED claim has a Tier 1 or Tier 2 artefact
- [ ] Evidence is relevant to the specific claim (not a related claim)
- [ ] Evidence is recent (< 1 hour or real-time)
- [ ] Evidence fully covers the claim (not partial)
- [ ] No Tier 4 (narrative) evidence accepted

## Output Format

Evidence verification reports use this format:

```markdown
## Evidence Verification

**Claim:** [what is being claimed as complete]

| Artefact   | Tier | Recency     | Relevant? | Verdict     |
| ---------- | ---- | ----------- | --------- | ----------- |
| [artefact] | T2   | 23 mins ago | Yes       | ✅ Accepted |
| [artefact] | T4   | Unknown     | Partially | ❌ Rejected |

**Overall Verdict:** INSUFFICIENT

**Gaps to fill:**

1. [specific artefact needed]
2. [specific artefact needed]

**Status remains:** UNKNOWN until gaps are filled
```

## Failure Modes

| Situation                                  | Action                                          |
| ------------------------------------------ | ----------------------------------------------- |
| Agent argues about evidence quality        | Cite the tier system, do not negotiate          |
| Evidence cannot be collected (system down) | Status = BLOCKED, not VERIFIED                  |
| Evidence quality is borderline Tier 2/3    | Default to lower tier, flag for re-verification |
| Founder accepts weak evidence              | Note risk, record decision, proceed with caveat |
