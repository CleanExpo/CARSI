# Execution Modes - Dynamic Governance Intensity

> **Scope**: Always-on mode detection and momentum protection
> **Authority**: Supplements Genesis Orchestrator intent mapping

## Mode Detection

Detect the active execution mode from user intent signals. Mode determines governance intensity across all systems.

### Four Modes

| Mode | Intent Signals | Governance Level |
|------|---------------|-----------------|
| **EXPLORATION** | "what is", "explain", "show me", "how does", "describe", "read" | Minimal |
| **BUILD** | "implement", "create", "fix", "add", "build", "write", "update" | Standard |
| **SCALE** | "optimise", "deploy", "refactor", "migrate", "performance", "production" | Full |
| **STRATEGY** | "plan", "architecture", "compare", "evaluate", "design", "spec" | Light + Von Neumann |

### Detection Rules

1. **Keyword match**: Scan user message for intent signals above
2. **Context continuation**: If no clear signal, inherit the mode from the previous turn
3. **Ambiguity resolution**: When multiple modes match, default to the **lower** governance level and clarify
4. **Override**: HIGH risk detection (from Execution Guardian) always escalates to full governance regardless of mode

---

## Governance Intensity by Mode

| System | EXPLORATION | BUILD | SCALE | STRATEGY |
|--------|------------|-------|-------|----------|
| **Council of Logic** | Shannon only | All four | All four | Von Neumann + Shannon |
| **Execution Guardian** | Off | Active (standard gates) | Active (full gates + rollback plans) | Off |
| **System Supervisor** | Off | Phase boundaries only | Full audit | Off |
| **Genesis Orchestrator** | Discovery mode | Full phase-locked execution | Full phase-locked execution | Blueprint mode |
| **Verification Agent** | Off | Standard | Comprehensive + regression | Off |

---

## Momentum Protection Rules

These rules prevent governance systems from interrupting productive work unnecessarily.

### Rule 1: No Unsolicited Audits During BUILD

The System Supervisor **must not** interrupt active BUILD mode with drift scans or completeness audits. Supervisor activates only at:
- Phase boundaries (between Genesis Orchestrator sections)
- Explicit user request ("audit", "check drift", "completeness")
- Before merge to main

### Rule 2: No SCALE Governance During EXPLORATION

When a user is exploring or learning the codebase, do not enforce validation gates, risk scoring, or comprehensive verification. Let them read freely.

### Rule 3: Default to Lower Governance When Ambiguous

If the mode is unclear:
- Assume EXPLORATION over BUILD
- Assume BUILD over SCALE
- Ask the user to clarify rather than over-governing

### Rule 4: HIGH Risk Overrides Mode

If the Execution Guardian detects a HIGH-risk operation (destructive, irreversible, security-impacting), governance escalates to SCALE intensity **regardless** of current mode. This is the only exception to momentum protection.

### Rule 5: Mode Transitions Are Explicit

Mode does not change mid-operation. If governance needs to escalate:
1. Complete or checkpoint current operation
2. Announce mode transition with reason
3. Apply new governance level

---

## Cross-References

### Genesis Orchestrator

Mode detection **supplements** (does not replace) the Genesis Orchestrator's intent mapping:

| Genesis Intent | Execution Mode |
|----------------|---------------|
| MATH_COUNCIL trigger | Current mode (council always available) |
| TITAN_DESIGN trigger | BUILD |
| GENESIS_DEV trigger | BUILD |
| PHASE_3_BLUEPRINT | STRATEGY |
| DISCOVERY_MODE | EXPLORATION |

### Council of Logic

- **Shannon** (token economy): Always active across all modes
- **Turing** (algorithmic efficiency): Active in BUILD and SCALE
- **Von Neumann** (architecture): Active in BUILD, SCALE, and STRATEGY
- **Bezier** (animation physics): Active in BUILD and SCALE (UI work only)

### Execution Guardian

- Activates in **BUILD** and **SCALE** modes only
- SCALE mode requires rollback plans for all MEDIUM and HIGH risk operations
- BUILD mode requires rollback plans for HIGH risk operations only

### System Supervisor

- **EXPLORATION**: Off
- **BUILD**: Scans at phase boundaries (between Genesis Orchestrator sections)
- **SCALE**: Full audit capability (drift, silent failures, completeness, strategic signals)
- **STRATEGY**: Off (planning phase — no code to audit)

---

## Response Annotation

When mode affects governance decisions, annotate briefly:

```
[MODE: BUILD] Standard governance active.
[MODE: SCALE] Full governance — rollback plan required.
[MODE: EXPLORATION → BUILD] Escalating: destructive operation detected.
```

Do not annotate when mode has no effect on the current action.

---

## Anti-Patterns

| Pattern | Problem | Correct Approach |
|---------|---------|------------------|
| Running full audit during EXPLORATION | Breaks flow, wastes tokens | Wait for BUILD/SCALE or explicit request |
| Applying validation gates to "explain X" | Over-governance kills momentum | Detect EXPLORATION mode, minimal governance |
| Ignoring HIGH risk in EXPLORATION mode | Safety gap | Rule 4: HIGH risk always escalates |
| Changing mode mid-operation without notice | Confusing, disrupts context | Complete or checkpoint, then announce transition |
| Defaulting to SCALE when unsure | Over-governance is costly | Default to lower governance, ask to clarify |
