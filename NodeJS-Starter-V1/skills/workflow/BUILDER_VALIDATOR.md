---
name: builder-validator
description: Strict Builder/Validator task planning pattern for quality assurance
triggers:
  - plan with builder validator
  - builder validator pattern
  - create execution plan
  - task decomposition
  - atomic tasks with validation
hooks:
  UserPromptSubmit:
    - hooks:
        - type: prompt
          prompt: "Check if this prompt requires Builder/Validator planning. If it involves implementation, refactoring, or complex tasks, suggest using the builder-validator skill."
---

# Builder/Validator Pattern

> **Strict Quality Assurance Through Paired Execution**

## Overview

The Builder/Validator pattern ensures every implementation task has a corresponding validation step. This eliminates the "self-attestation" anti-pattern where builders claim their own work is complete without independent verification.

## Core Principle

```
Builder → Validator → [Next Builder]
   ↓           ↓
Implement   Verify
   ↓           ↓
Output ───→ Pass/Fail
```

**Rule**: No Builder proceeds until the previous Validator passes.

## When to Use

### Mandatory Use Cases
- ✅ New feature implementation
- ✅ Refactoring existing code
- ✅ Database migrations
- ✅ API endpoint creation
- ✅ Component development
- ✅ Configuration changes

### Optional Use Cases
- 🟡 Documentation updates (single-phase)
- 🟡 Simple bug fixes (< 5 lines)
- 🟡 Configuration tweaks

## Workflow

### Phase Structure

Each task is decomposed into **phases**, and each phase contains **Builder/Validator pairs**:

```yaml
Phase 1: Setup & Foundation
  Task 1.1:
    Builder: Analyze existing codebase structure
    Validator: Verify project structure documented
  Task 1.2:
    Builder: Create/update necessary directories  
    Validator: Verify directories exist with correct permissions

Phase 2: Core Implementation
  Task 2.1:
    Builder: Implement main functionality per requirements
    Validator: Verify code compiles/parses without errors
  Task 2.2:
    Builder: Add error handling and edge cases
    Validator: Verify error paths tested and working

Phase 3: Integration & Testing
  Task 3.1:
    Builder: Integrate with existing systems
    Validator: Verify integration tests pass
  Task 3.2:
    Builder: Write/update unit tests
    Validator: Verify test coverage >80% for new code
  Task 3.3:
    Builder: Run full test suite
    Validator: Verify all tests pass

Phase 4: Documentation & Handover
  Task 4.1:
    Builder: Update README and documentation
    Validator: Verify documentation accuracy
  Task 4.2:
    Builder: Create deployment/configuration guides
    Validator: Verify guides are complete and tested
```

## Agent Roles

### Builder Agent

**Role**: Implementation  
**Responsibilities**:
- Write code, update configs, edit files
- Follow existing patterns and conventions
- Write clean, documented code
- Update related files (barrel exports, configs)
- Never skip tests or validation

**Principles**:
1. Start only after previous Validator passes
2. Focus on single responsibility per task
3. Document as you go
4. Test your own work before calling Validator
5. Don't rush - quality over speed

### Validator Agent

**Role**: Quality Assurance  
**Responsibilities**:
- Verify implementation meets requirements
- MUST run immediately after Builder completes
- Check file exists and is readable
- Verify syntax is valid (no parse errors)
- Verify tests pass (if applicable)
- Verify integration works (if applicable)
- Verify documentation updated (if required)

**Principles**:
1. Be thorough, not quick
2. Check the actual output, not the intent
3. Fail fast if requirements not met
4. Provide specific feedback on failures
5. No self-attestation (can't validate own work)

## Validation Checklist

### Code Validation
- [ ] File exists at expected path
- [ ] Syntax valid (no parse/compile errors)
- [ ] Follows project conventions
- [ ] Properly exported (barrel files updated)
- [ ] No debug statements left (console.log, etc.)
- [ ] Error handling implemented

### Test Validation
- [ ] Tests exist for new functionality
- [ ] Tests pass (pnpm test, pytest)
- [ ] Coverage >80% for new code
- [ ] Edge cases covered
- [ ] Integration tests pass (if applicable)

### Integration Validation
- [ ] Works with existing systems
- [ ] No breaking changes
- [ ] API contracts maintained
- [ ] Database migrations valid (if applicable)
- [ ] Environment variables documented (if new)

### Documentation Validation
- [ ] README updated (if needed)
- [ ] Code comments added (if complex)
- [ ] API documentation updated (if applicable)
- [ ] CHANGELOG updated (if user-facing)
- [ ] Deployment notes created (if needed)

## Escalation Criteria

Escalate to human when:

1. **Builder fails 3 times** on same task
   - May indicate unclear requirements
   - May require architectural decision

2. **Validator fails 3 times** on same check
   - May indicate systemic issue
   - May require rethinking approach

3. **Unclear requirements**
   - Don't proceed with assumptions
   - Request clarification first

4. **Breaking changes detected**
   - Pause and assess impact
   - Get approval before proceeding

5. **Dependencies blocked**
   - External service down
   - Missing credentials/permissions

## Commands

### Generate Plan via PowerShell
```powershell
# Import module
Import-Module ./scripts/plan-w-team.ps1

# Generate plan
plan_w_team -Task "Implement user authentication API"

# With estimates
plan_w_team -Task "Add dark mode toggle" -IncludeEstimates

# Custom output path
plan_w_team -Task "Refactor database layer" -OutputPath "./plans/db-refactor.md"
```

### Generate Plan via Node.js
```bash
# Basic usage
node scripts/plan-w-team.js "Implement user authentication API"

# With estimates
node scripts/plan-w-team.js "Add dark mode toggle" --estimates

# Custom output
node scripts/plan-w-team.js "Refactor database layer" --output ./plans/db-refactor.md
```

### Generate Plan via pnpm Script
```bash
# Add to package.json scripts:
# "plan": "node scripts/plan-w-team.js"

pnpm plan "Your task description"
```

## Output Format

Generated plans are saved to `specs/plan.md` (or custom path):

```markdown
# Execution Plan: [Task Name]

**Task ID:** [unique-id]
**Created:** [timestamp]
**Status:** In Progress
**Architecture:** Builder/Validator Pattern

---

## Team Structure
[Builder and Validator roles]

## Phase 1: Setup & Foundation
### Phase 1.1
- [ ] **Builder**: [Task description]
  - [ ] **Validator**: [Verification step]

## Completion Criteria
- [ ] All Builder tasks completed
- [ ] All Validator checks passed

## Escalation Triggers
[When to escalate to human]
```

## Examples

### Example 1: New Feature
```
Task: "Add user profile page with avatar upload"

Phase 1: Setup & Foundation
  - Builder: Create profile page directory structure
  - Validator: Verify directories exist

Phase 2: Core Implementation
  - Builder: Create profile form component
  - Validator: Verify component renders without errors
  - Builder: Add avatar upload functionality
  - Validator: Verify upload works with test images

Phase 3: Integration & Testing
  - Builder: Connect to user API
  - Validator: Verify API integration works
  - Builder: Write component tests
  - Validator: Verify tests pass with >80% coverage

Phase 4: Documentation & Handover
  - Builder: Update component documentation
  - Validator: Verify docs are accurate
```

### Example 2: Refactoring
```
Task: "Refactor authentication module"

Phase 1: Analysis & Planning
  - Builder: Identify code smells and issues
  - Validator: Verify issues documented
  - Builder: Establish baseline metrics
  - Validator: Verify baseline reproducible

Phase 2: Refactoring Execution
  - Builder: Extract auth utilities
  - Validator: Verify utilities work standalone
  - Builder: Update dependent code
  - Validator: Verify no breaking changes

Phase 3: Validation
  - Builder: Compare metrics before/after
  - Validator: Verify improvements
  - Builder: Run regression tests
  - Validator: Verify all tests pass
```

## Anti-Patterns to Avoid

### ❌ Self-Attestation
```
Builder: "I've implemented the feature and it works"
[No Validator - DON'T DO THIS]
```

### ❌ Skipping Validation
```
Builder: Implements feature
Validator: "I'll skip validation this time"
[NEVER skip validation]
```

### ❌ Vague Validation
```
Builder: "Add user authentication"
Validator: "Verify it works"
[Too vague - be specific]
```

### ❌ Multiple Builders Before Validation
```
Builder 1: Creates API
Builder 2: Creates UI
[Only then Validator checks both]
[DON'T batch - validate each Builder]
```

## Best Practices

### ✅ Atomic Tasks
Each task should have a single, clear responsibility.

**Good**: "Create LoginForm component with email/password fields"
**Bad**: "Build entire authentication system"

### ✅ Specific Validation
Validators should have clear, verifiable criteria.

**Good**: "Verify LoginForm renders without errors and validates email format"
**Bad**: "Verify login works"

### ✅ Early Validation
Don't wait until the end to validate. Validate each increment.

### ✅ Document Assumptions
If you make assumptions during building, document them for the Validator.

### ✅ Australian Standards
All documentation and code comments must use Australian English (en-AU).

## Integration with Claude Hooks

The Builder/Validator pattern works seamlessly with the existing Claude Code hooks:

- **Security hooks** validate before Builder executes dangerous commands
- **Quality hooks** run async validation after Builder edits files
- **Australian compliance hooks** ensure en-AU standards in all output
- **Failure analyzer** helps when Validator finds issues

## Success Metrics

A successful Builder/Validator execution:
- ✅ All phases completed
- ✅ All Validators passed on first attempt
- ✅ No escalations required
- ✅ Code passes all automated checks
- ✅ Documentation complete and accurate

---

**Version**: 2.0.0  
**Last Updated**: 2025-02-04  
**Australian Compliance**: ✅ Verified
