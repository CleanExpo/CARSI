# Governance Framework Template

This template installs the CARSI AI Development Governance Framework into any new project.

## What This Installs

| File                                         | Purpose                                                      |
| -------------------------------------------- | ------------------------------------------------------------ |
| `memory.md`                                  | Operational constitution — loaded before any agent reasoning |
| `docs/agent-framework/`                      | Agent hierarchy documentation                                |
| `.skills/custom/outcome-translator/`         | Founder outcome language conversion                          |
| `.skills/custom/definition-of-done-builder/` | Done criteria generation                                     |
| `.skills/custom/blueprint-first/`            | ASCII blueprint gate                                         |
| `.skills/custom/finished-audit/`             | Production readiness audit                                   |
| `.skills/custom/evidence-verifier/`          | Proof artefact validation                                    |
| `.skills/custom/model-currency-checker/`     | AI model version checks                                      |
| `.skills/custom/visual-excellence-enforcer/` | Visual quality gate                                          |
| `.skills/custom/delegation-planner/`         | Task routing to correct agent                                |
| `src/ai/`                                    | TypeScript AI model registry and audit utilities             |
| `scripts/governance-check.sh`                | Shell script to verify framework is installed                |

## Usage

### Option 1: Manual Copy

Copy the contents of this template into your new project root.

### Option 2: Script

```bash
bash scripts/install-governance.sh /path/to/new-project
```

### Option 3: During Project Scaffold

The genesis-orchestrator skill automatically includes this framework when generating new projects.

## After Installation

1. Update `memory.md` with project-specific stack details
2. Add package.json scripts (see `package-scripts.json`)
3. Run `pnpm ai:governance:check` to verify installation
