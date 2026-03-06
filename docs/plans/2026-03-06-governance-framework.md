# AI Development Governance Framework — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install a permanent governance framework that converts founder outcome language into senior-level engineering execution with gated proof requirements.

**Architecture:** A root-level `memory.md` acts as the operational constitution, loaded by all agents. Four new skills encode the framework's core workflows. CLAUDE.md is updated to reference the new constitution.

**Tech Stack:** Markdown, existing `.skills/custom/` pattern, CLAUDE.md hook system.

---

### Task 1: Create memory.md at repo root

**Files:**

- Create: `memory.md`

### Task 2: Update CLAUDE.md to load memory.md

**Files:**

- Modify: `CLAUDE.md`

### Task 3: Create outcome-translator skill

**Files:**

- Create: `.skills/custom/outcome-translator/SKILL.md`

### Task 4: Create blueprint-first skill

**Files:**

- Create: `.skills/custom/blueprint-first/SKILL.md`

### Task 5: Create finished-audit skill

**Files:**

- Create: `.skills/custom/finished-audit/SKILL.md`

### Task 6: Create evidence-verifier skill

**Files:**

- Create: `.skills/custom/evidence-verifier/SKILL.md`

### Task 7: Commit all files

**Command:**

```bash
git add memory.md CLAUDE.md .skills/custom/outcome-translator .skills/custom/blueprint-first .skills/custom/finished-audit .skills/custom/evidence-verifier
git commit -m "feat(governance): install AI development governance framework"
```
