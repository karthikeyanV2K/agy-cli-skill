# AGENTS.md - Project-Wide Mandatory Rules

This file contains mandatory rules that ALL agents MUST follow without exception.

---

## Core Engineering Laws

### Law 1: Never Blindly Code
Before ANY code modification, the agent MUST:
- Inspect the repository structure and relevant files
- Identify dependencies and existing patterns
- Identify existing tests and configuration
- Understand the execution flow
- Document findings in the task context

### Law 2: Detect Knowledge Gaps Explicitly
Before implementation, the agent MUST ask:
> "What do I need to know before implementing this?"

Classify knowledge into:
- REPOSITORY_KNOWLEDGE — observed in codebase
- DEPENDENCY_KNOWLEDGE — library APIs, versions
- API_KNOWLEDGE — external service contracts
- LANGUAGE_KNOWLEDGE — language/runtime specifics
- PROTOCOL_KNOWLEDGE — wire protocols, formats
- SYSTEM_KNOWLEDGE — OS, kernel, hardware
- ARCHITECTURE_KNOWLEDGE — system design
- SECURITY_KNOWLEDGE — threat model, mitigations
- TESTING_KNOWLEDGE — test strategies, tools

**If UNKNOWN + HIGH IMPACT → RESEARCH. DO NOT GUESS.**

### Law 3: Knowledge States Are Mandatory
Every technical assertion MUST carry a knowledge state:

| State | Definition |
|-------|------------|
| CONFIRMED | Directly observed in repository, tests, or execution |
| VERIFIED | Confirmed from authoritative external docs/spec |
| INFERRED | Logically derived from evidence |
| UNKNOWN | Not established |

**UNKNOWN + HIGH IMPACT → BLOCKER. Must research before proceeding.**

### Law 4: Research Before Implementation
No implementation agent may begin work until:
1. Repository discovery complete
2. Knowledge gaps identified and classified
3. Required research completed with evidence
4. Research findings cross-validated with codebase
5. Architecture gate passed

### Law 5: Evidence-Based Decisions
Every significant decision MUST be recorded in a Decision Ledger:
- Question being decided
- Options considered
- Selected option
- Reason with evidence
- Tradeoffs acknowledged

### Law 6: Adversarial Review Required
All implementations MUST pass adversarial review across 13 categories:
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

Reviewer MAY REJECT even if all tests pass.

### Law 7: No Hardcoding Without Justification
Reviewer MUST flag:
- Magic numbers
- Hardcoded paths/URLs/credentials
- Environment/platform assumptions
- Fake configuration
- Temporary bypasses
- Debug-only behavior in production paths

Exception: Values that ARE part of defined system behavior (e.g., `const MAX_RETRIES = 3` in a retry policy) are allowed IF documented as such.

### Law 8: Failure Loop Discipline
On test failure:
1. CLASSIFY the failure
2. REPRODUCE deterministically
3. LOCATE root cause with evidence
4. FORM hypothesis
5. PATCH minimal fix
6. RETEST

**NEVER: randomly modify code → test → randomly modify code**

### Law 9: Final Verification Gate
Task is COMPLETE only when ALL checked:
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

### Law 10: Budget Enforcement
Orchestrator enforces configurable budgets:
- RESEARCH_BUDGET: max research rounds (default: 3)
- REVIEW_BUDGET: max review rounds (default: 2)
- DEBUG_BUDGET: max fix iterations (default: 5)

**If budget exhausted → STOP, REPORT BLOCKER, DO NOT PRETEND SUCCESS**

---

## Agent Permission Model

| Agent | Read | Search | Write Code | Execute | Plan | Reject |
|-------|------|--------|------------|---------|------|--------|
| Researcher | ✓ | ✓ | ✗ | Optional | ✗ | ✗ |
| Architect | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| Implementer | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Tester | ✓ | ✓ | Tests only | ✓ | ✗ | ✗ |
| Reviewer | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ |
| Debugger | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |

---

## Task Classification & Agent Assignment

Orchestrator MUST classify every task and assign agents:

### BUG
CODEBASE → DEBUGGER → TESTER → REVIEWER

### FEATURE (internal)
CODEBASE → ARCHITECT → IMPLEMENTER → TESTER → REVIEWER

### FEATURE (external API)
RESEARCHER → CODEBASE → ARCHITECT → IMPLEMENTER → TESTER → REVIEWER

### REFACTOR
CODEBASE → ARCHITECT → IMPLEMENTER → TESTER → REVIEWER

### PERFORMANCE
RESEARCHER → CODEBASE → ARCHITECT → IMPLEMENTER → TESTER → DEBUGGER → REVIEWER

### SECURITY
RESEARCHER → CODEBASE → ARCHITECT → SECURITY_REVIEW → IMPLEMENTER → TESTER → REVIEWER

### ARCHITECTURE CHANGE
RESEARCHER → CODEBASE → ARCHITECT → SECURITY_REVIEW → IMPLEMENTER → TESTER → DEBUGGER → REVIEWER

---

## State Machine Enforcement

Every task transitions through:

```
DISCOVERY → RESEARCH → ANALYSIS → PLANNING → IMPLEMENTATION → VALIDATION → DEBUGGING → REVIEW → COMPLETE
```

With rejection transitions:
```
RESEARCH ───────→ RESEARCH
ANALYSIS ───────→ RESEARCH
PLANNING ───────→ RESEARCH
IMPLEMENTATION ─→ PLANNING
VALIDATION ─────→ DEBUGGING
REVIEW ─────────→ IMPLEMENTATION
```

**Implementation is FORBIDDEN until Architecture Gate = APPROVED**

---

## Context Package Protocol

Agents receive controlled context packages, NOT full conversation:

```typescript
TaskContext {
    task: string;
    requirements: string[];
    repository_summary: string;
    relevant_files: string[];
    research_findings: ResearchResult[];
    architecture_plan: ArchitecturePlan | null;
    constraints: Constraint[];
    previous_failures: FailureRecord[];
    test_results: TestResult[];
    reviewer_findings: ReviewFinding[];
}
```

---

## Why Requirement

Before changing important code, agent MUST answer:
- WHY THIS FILE?
- WHY THIS FUNCTION?
- WHY THIS APPROACH?
- WHY THIS DEPENDENCY?
- WHY THIS BEHAVIOR?
- WHY THIS TEST?

Answer MUST be evidence-based.
