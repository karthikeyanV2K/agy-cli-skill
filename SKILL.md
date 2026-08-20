---
name: eaf
version: "1.0.0"
description: "Master engineering rules: DISCOVER→RESEARCH→REASON→PLAN→IMPLEMENT→VERIFY→REVIEW"
triggers: ["eaf", "EAF", "engineering", "workflow", "process", "methodology", "orchestrator"]
target_agents: ["orchestrator", "researcher", "architect", "implementer", "validator", "debugger", "reviewer"]
---

# Master Engineering Skill

**This is the central law of AGY and the Enterprise Agent Framework (EAF). All agents inherit and enforce these rules.**

---

## Fundamental Rule

```
DISCOVER → RESEARCH → REASON → PLAN → IMPLEMENT → VERIFY → REVIEW
```

**No phase may be skipped. No phase may begin before the previous gate passes.**

---

## Core Engineering Laws

1. **Never Blindly Code**: Before ANY code modification, inspect repo structure, files, dependencies, tests, config, and flow.
2. **Detect Knowledge Gaps Explicitly**: Classify knowledge into REPOSITORY, DEPENDENCY, API, LANGUAGE, PROTOCOL, SYSTEM, ARCHITECTURE, SECURITY, TESTING. If UNKNOWN + HIGH IMPACT → RESEARCH.
3. **Knowledge States Are Mandatory**: Every assertion must carry `CONFIRMED`, `VERIFIED`, `INFERRED`, or `UNKNOWN`.
4. **Research Before Implementation**: Implementation is strictly forbidden until repository discovery is complete, knowledge gaps resolved, and architecture gate passed.
5. **Evidence-Based Decisions**: Record all significant decisions in a Decision Ledger with options, reason, evidence, and tradeoffs.
6. **Adversarial Review Required**: All implementations must pass adversarial review across 13 categories.
7. **No Hardcoding Without Justification**: Flag magic numbers, hardcoded paths/URLs/credentials, env assumptions, temporary bypasses.
8. **Failure Loop Discipline**: On test failure: CLASSIFY → REPRODUCE → LOCATE ROOT CAUSE → FORM HYPOTHESIS → PATCH → RETEST.
9. **Final Verification Gate**: 12-point checklist must be completely checked before marking complete.
10. **Budget Enforcement**: Orchestrator enforces research, review, and debug budgets.

---

## Phase Definitions & Gates

### 1. DISCOVER (Repository Inspection)
**Goal**: Understand the codebase relevant to the task.
**Actions**:
- Map repository structure
- Identify relevant files, modules, packages
- Trace execution flow for the feature area
- Catalog existing patterns, abstractions, conventions
- Find existing tests and test patterns
- Document configuration and build system
**Gate**: `REPOSITORY_INSPECTED = true`
**Output**: `RepositorySummary { files, patterns, tests, config, flow }`

### 2. RESEARCH (Knowledge Gap Resolution)
**Goal**: Resolve all UNKNOWN + HIGH IMPACT knowledge gaps.
**Actions**:
- Enumerate knowledge gaps from Discovery
- Classify each gap by type and impact
- For each HIGH IMPACT gap:
  - Form specific, targeted question
  - Search authoritative sources in priority order
  - Extract facts with citations
  - Cross-validate with codebase
- Record in Assumption Ledger
**Gate**: `ALL_HIGH_IMPACT_GAPS_RESOLVED = true`
**Output**: `ResearchResult { question, repo_evidence, external_evidence, authoritative_sources, current_version, recommended_approach, alternatives, risks, unknowns, confidence }`

### 3. REASON (Analysis & Synthesis)
**Goal**: Synthesize findings into coherent understanding.
**Actions**:
- Cross-validate repository findings with research
- Identify constraints and invariants
- Determine architectural implications
- Update Assumption Ledger (CONFIRMED/VERIFIED/INFERRED)
- Record decisions in Decision Ledger
**Gate**: `ANALYSIS_COMPLETE = true`
**Output**: `AnalysisReport { constraints, invariants, implications, assumptions, decisions }`

### 4. PLAN (Architecture & Implementation Plan)
**Goal**: Create detailed, reviewable implementation plan.
**Actions**:
- Architect produces Architecture Plan
- Define data flow, control flow, dependencies
- Specify implementation strategy
- Define testing strategy
- Identify failure modes and mitigations
- Record in Decision Ledger
**Gate**: `ARCHITECTURE_GATE = APPROVED` (not RESEARCH_REQUIRED, not REJECTED)
**Output**: `ArchitecturePlan { goal, current_arch, affected_components, data_flow, control_flow, dependencies, strategy, alternatives, why_selected, failure_modes, compatibility, testing_strategy }`

### 5. IMPLEMENT (Code Production)
**Goal**: Produce minimal, correct implementation per plan.
**Rules**:
- Preserve existing architecture
- Modify minimum required files
- Reuse existing abstractions
- Don't duplicate existing functionality
- Don't introduce unnecessary dependencies
- Don't hardcode environment-specific values
- Don't silently remove behavior
- Don't fake external services
- Don't weaken tests
- Don't suppress errors to obtain passing build
- Every change must answer the WHY questions
**Gate**: `IMPLEMENTATION_COMPLETE = true`
**Output**: `ImplementationResult { changed_files, diff, why_each_change }`

### 6. VERIFY (Multi-Level Validation)
**Goal**: Validate at appropriate levels for the change.
**Validation Levels**:
```
FORMAT → STATIC ANALYSIS → BUILD → UNIT TEST → INTEGRATION TEST → E2E TEST → REGRESSION TEST
```
**Gate**: `VALIDATION_PASSED = true`
**Output**: `ValidationResult { levels_run, results, coverage, regressions }`

### 7. DEBUG (Failure Loop)
**Goal**: Root cause and fix any validation failures.
**Protocol** (MANDATORY):
```
TEST FAILURE → CLASSIFY → REPRODUCE → LOCATE ROOT CAUSE → FORM HYPOTHESIS → PATCH → RETEST
```
**Debugger MUST produce**:
```
Observed failure: ...
Expected: ...
Actual: ...
Root cause: ...
Evidence: ...
Fix: ...
Why this fixes root cause: ...
```
**Gate**: `ALL_TESTS_PASS = true`
**Output**: `DebugRecord { failure, classification, root_cause, hypothesis, fix, verification }`

### 8. REVIEW (Adversarial Audit)
**Goal**: Actively attempt to break the implementation.
**Review Categories** (13):
1. CORRECTNESS
2. ARCHITECTURE
3. EDGE CASES
4. ERROR HANDLING
5. CONCURRENCY
6. SECURITY
7. PERFORMANCE
8. RESOURCE MANAGEMENT
9. COMPATIBILITY
10. TEST COVERAGE
11. MAINTAINABILITY
12. HARDCODING
13. REGRESSION

**Reviewer MAY REJECT even if all tests pass.**
**Gate**: `REVIEW_STATUS = APPROVED` (not REJECT)
**Output**: `ReviewReport { category, finding, severity, evidence, recommendation }`

### 9. FINAL VERIFICATION
**Goal**: Confirm all laws satisfied before COMPLETE.
**Checklist** (ALL must be checked):
- [ ] Requirements understood
- [ ] Repository inspected
- [ ] Knowledge gaps resolved
- [ ] External APIs/specs verified
- [ ] Architecture reviewed
- [ ] Implementation completed
- [ ] Build successful
- [ ] Relevant tests passed
- [ ] Regression checked
- [ ] Diff reviewed
- [ ] No unexplained hardcoding
- [ ] No known unresolved issues
