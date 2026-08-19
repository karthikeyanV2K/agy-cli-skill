# SKILL.md - Master Engineering Skill

**This is the central law of AGY. All agents inherit and enforce these rules.**

---

## Fundamental Rule

```
DISCOVER → RESEARCH → REASON → PLAN → IMPLEMENT → VERIFY → REVIEW
```

**No phase may be skipped. No phase may begin before the previous gate passes.**

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
  - Search authoritative sources (priority order):
    1. Existing repository code
    2. Official documentation
    3. Official source code
    4. Standards/specifications
    5. Maintainer documentation
    6. High-quality technical references
    7. Community discussions (lowest priority)
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
**Validation Levels** (tester selects appropriate):
```
FORMAT → STATIC ANALYSIS → BUILD → UNIT TEST → INTEGRATION TEST → E2E TEST → REGRESSION TEST
```
**For Rust/kernel work**:
```
cargo check → cargo build → cargo test → cargo clippy → cargo fmt --check → QEMU boot → serial output → kernel tests → integration tests
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
**Checklist** (ALL must be ✓):
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

**Status**: `COMPLETE` or `INCOMPLETE`

---

## Prohibited Behaviors (Auto-Reject)

- ❌ GUESSING important technical facts
- ❌ IMPLEMENTING unverified external APIs
- ❌ DECLARING SUCCESS without execution evidence
- ❌ MODIFYING unrelated code
- ❌ HIDING failures to obtain passing build
- ❌ TREATING model knowledge as repository fact
- ❌ SKIPPING research gate
- ❌ SKIPPING architecture gate
- ❌ SKIPPING adversarial review

---

## Assumption Ledger Format

```
ASSUMPTIONS

A1: The project uses dependency X version Y.
  Evidence: Cargo.toml
  Status: CONFIRMED

A2: API Z returns Result<T, E>.
  Evidence: Official documentation v2.3
  Status: VERIFIED

A3: This function can execute concurrently.
  Evidence: Code analysis - no shared mutable state
  Status: INFERRED

A4: Kernel API W is stable across versions.
  Evidence: None
  Status: UNKNOWN  ← HIGH IMPACT = BLOCKER
```

**No HIGH-IMPACT UNKNOWN assumptions allowed at Architecture Gate.**

---

## Decision Ledger Format

```
DECISION D001

Question: How should X be implemented?

Option A: ...
Option B: ...
Option C: ...

Selected: B
Reason: ...
Evidence: ...
Tradeoffs: ...
```

---

## Research Quality Standards

### Targeted Research (REQUIRED)
```
IDENTIFY KNOWLEDGE GAP → FORM SPECIFIC QUESTION → SEARCH AUTHORITATIVE SOURCE → READ RELEVANT MATERIAL → EXTRACT FACT → COMPARE WITH CODEBASE → APPLY
```

### Bad vs Good Research Questions
```
❌ Bad: "Search Rust async."
✅ Good: "What is the currently supported API for tokio::sync::mpsc in tokio 1.35, and does it require the 'full' feature flag?"
```

### Source Priority (Enforced)
1. Repository code (highest)
2. Official documentation
3. Official source code
4. Standards/specifications (RFC, ISO, etc.)
5. Maintainer blogs/docs
6. High-quality technical references (e.g., Kernel.org, MSDN, POSIX)
7. Community discussions (StackOverflow, Reddit - lowest, cite with caution)

**Random search results are NEVER authoritative automatically.**

---

## Implementation Rules Checklist

- [ ] Preserve existing architecture
- [ ] Modify minimum required files
- [ ] Reuse existing abstractions
- [ ] Don't duplicate existing functionality
- [ ] Don't introduce unnecessary dependencies
- [ ] Don't hardcode environment-specific values
- [ ] Don't silently remove behavior
- [ ] Don't fake external services
- [ ] Don't weaken tests
- [ ] Don't suppress errors merely to obtain successful build

---

## Testing Strategy Selection

Tester MUST determine correct validation level:

| Change Type | Required Levels |
|-------------|-----------------|
| Formatting only | FORMAT |
| Refactor (no logic change) | FORMAT, STATIC, BUILD, UNIT, REGRESSION |
| New feature (internal) | FORMAT, STATIC, BUILD, UNIT, INTEGRATION, REGRESSION |
| External API integration | FORMAT, STATIC, BUILD, UNIT, INTEGRATION, E2E, REGRESSION |
| Security fix | FORMAT, STATIC, BUILD, UNIT, INTEGRATION, SECURITY_SCAN, REGRESSION |
| Architecture change | FORMAT, STATIC, BUILD, UNIT, INTEGRATION, E2E, REGRESSION |
| Kernel/driver | FORMAT, STATIC, BUILD, UNIT, INTEGRATION, QEMU, KERNEL_TESTS, REGRESSION |

---

## Budget Configuration

```yaml
research_budget:
  max_rounds: 3

review_budget:
  max_rounds: 2

debug_budget:
  max_iterations: 5
```

When budget exhausted → STOP, REPORT BLOCKER, DO NOT PRETEND SUCCESS.
