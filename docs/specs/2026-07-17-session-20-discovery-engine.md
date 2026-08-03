# SESSION 20 — Standing Discovery Engine

**Hand this block to BOTH CLIs. It runs alongside the overnight package; it does not replace any session.**
**It does not terminate when drafting completes. Drafting finishing is not a stop condition.**

---

## Mission

Continuously hunt for four things the drafting sessions are structurally blind to:

1. **Missing principles** — rules the work depends on but has never stated.
2. **Contradictions** — two locked decisions that cannot both be honoured.
3. **Shaky evidence** — claims resting on assertion, memory, or a stale artifact.
4. **Long-term blind spots** — what will be wrong in six months that looks fine tonight.

## The Prime Rule

**Agreement is not evidence. Consensus between two models is a correlated error, not a verification.**

Grounding for this rule, from the CARSI H5 overnight handoff (2026-07-17): six claims were
asserted as true; **zero** were caught by self-review; **all six** were caught by checking the
live system. One was a self-audit that marked "no unverified claim asserted as fact: PASS"
*on a fabricated claim*. A model grading its own work returned a false PASS.

Therefore: a finding is promoted **only** by a retrieved source or a tool result from the
current session. Never by "both systems agreed."

## Roles — alternate every cycle, never fixed

| Cycle | DEFENDER | ATTACKER |
|---|---|---|
| odd | Claude | Codex |
| even | Codex | Claude |

- **DEFENDER** states the claim and the evidence it rests on.
- **ATTACKER** must attempt to **refute**, not review. Default to `refuted=true` under uncertainty.
- Neither role may verify its own prior output. A model that produced a claim may not defend it
  in the next cycle — swap first.

## The Loop

```
1. HARVEST   → scan session output + prod/live state for the four target classes
2. DEFEND    → DEFENDER states claim + evidence pointer (file:line, API response, tool result)
3. ATTACK    → ATTACKER tries to break it; cites what it checked
4. RECORD    → write the disagreement to the ledger, resolved or not
5. PROPOSE   → emit a proposal (never a merge, never a truth claim)
6. REPEAT    → no exit on "drafting done". Only exit: budget or explicit human stop.
```

## Output Contract — proposals only

Nothing this engine produces is ever merged, declared true, or made constitutional by the
engine itself. Every output is a **proposal** with this shape:

```json
{
  "id": "S20-<n>",
  "class": "missing-principle | contradiction | shaky-evidence | blind-spot",
  "claim": "<one sentence>",
  "evidence": ["<tool result / file:line / API response from THIS session>"],
  "confidence": 0.0,
  "confidence_basis": "why this number — what would move it",
  "defender": "claude|codex",
  "attacker": "claude|codex",
  "attack_survived": true,
  "disagreement": "<recorded even if resolved; null only if never contested>",
  "verified_against_live_system": true,
  "human_decision_required": true
}
```

**Confidence scale — evidence-tiered, not vibes:**

| Score | Meaning |
|---|---|
| 0.9–1.0 | Verified against the live system this session, survived attack |
| 0.6–0.8 | Retrieved source this session, survived attack, live state unchecked |
| 0.3–0.5 | Reasoned from artifacts; no live check; attack partially landed |
| 0.0–0.2 | Assertion or memory only — **flag, never act** |

Any proposal at ≤0.2 that both models nonetheless believe is itself a finding: it is the
shape of a shared hallucination. Record it as such.

## The Ledger — every disagreement survives

Append-only. Never rewrite, never delete, never resolve silently.

- Path: `docs/session-20/ledger.jsonl`
- Unresolved disagreements are **not failures** — they are the highest-value output.
  An unresolved contradiction that both models refuse to fake-resolve is worth more than
  ten agreed proposals.
- Resolved disagreements keep the losing argument on record with the reason it lost.

## Escalation — what stops and waits for the human

- Any contradiction between two **locked** decisions (e.g. H5 Q1 "rebuild from scratch" vs
  Q6 "keep it live" — currently open, unresolved, and correctly left that way).
- Any proposal that would change a constitutional rule.
- Any finding where the evidence needed is founder-only knowledge (the H5 interview class).

The engine **never** promotes its way past these. It records and waits.

## Anti-patterns — automatic reject

- "Both systems agree, therefore true" → correlated error. Reject.
- "Merged / Done / shipped, therefore live" → the H5 run proved this false repeatedly
  (PR #603 merged, prod served $0; assets marked Done never reached learners).
  **Check the live system.**
- "0 findings" from an unproven query → run a positive control first. A broken check and a
  clean system return identical output.
- Silent scope growth into drafting work. This engine discovers; it does not build.
