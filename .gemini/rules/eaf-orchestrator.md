# EAF Orchestrator Protocol Rule

When the user starts a request with `/EAF` or asks for Enterprise Agent Framework (EAF) execution, activate the full EAF Multi-Agent Orchestrator Mode.

---

## 1. Task Classification & Agent Assignment
Classify the task into one of the standard archetypes and assign the agent pipeline:
- **BUG**: `CODEBASE` → `DEBUGGER` → `TESTER` → `REVIEWER`
- **FEATURE (Internal)**: `CODEBASE` → `ARCHITECT` → `IMPLEMENTER` → `TESTER` → `REVIEWER`
- **FEATURE (External API)**: `RESEARCHER` → `CODEBASE` → `ARCHITECT` → `IMPLEMENTER` → `TESTER` → `REVIEWER`
- **REFACTOR**: `CODEBASE` → `ARCHITECT` → `IMPLEMENTER` → `TESTER` → `REVIEWER`
- **PERFORMANCE**: `RESEARCHER` → `CODEBASE` → `ARCHITECT` → `IMPLEMENTER` → `TESTER` → `DEBUGGER` → `REVIEWER`
- **SECURITY**: `RESEARCHER` → `CODEBASE` → `ARCHITECT` → `SECURITY_REVIEW` → `IMPLEMENTER` → `TESTER` → `REVIEWER`
- **ARCHITECTURE CHANGE**: `RESEARCHER` → `CODEBASE` → `ARCHITECT` → `SECURITY_REVIEW` → `IMPLEMENTER` → `TESTER` → `DEBUGGER` → `REVIEWER`

---

## 2. The 10 Core Engineering Laws
1. **Law 1: Never Blindly Code** — Inspect repo structure, relevant files, dependencies, tests, config, and execution flow first.
2. **Law 2: Detect Knowledge Gaps Explicitly** — Classify gaps (`REPOSITORY`, `DEPENDENCY`, `API`, `LANGUAGE`, `PROTOCOL`, `SYSTEM`, `ARCHITECTURE`, `SECURITY`, `TESTING`). If `UNKNOWN + HIGH IMPACT` → Must research before implementation.
3. **Law 3: Knowledge States Are Mandatory** — Every assertion must carry `CONFIRMED`, `VERIFIED`, `INFERRED`, or `UNKNOWN`.
4. **Law 4: Research Before Implementation** — No implementation begins until discovery is complete, gaps resolved, and architecture gate passed.
5. **Law 5: Evidence-Based Decisions** — Maintain a Decision Ledger (Question, Options Considered, Selected Option, Reason, Evidence, Tradeoffs).
6. **Law 6: Adversarial Review Required** — Implementation must pass 13-category adversarial audit before completion.
7. **Law 7: No Hardcoding Without Justification** — Flag magic numbers, fixed URLs, credentials, paths, and environment assumptions.
8. **Law 8: Failure Loop Discipline** — On test failure: `CLASSIFY` → `REPRODUCE` → `LOCATE` → `HYPOTHESIZE` → `PATCH` → `RETEST`.
9. **Law 9: Final Verification Gate** — All 12 verification checklist items must be strictly satisfied.
10. **Law 10: Budget Enforcement** — Enforce research rounds (≤3), review rounds (≤2), and debug iterations (≤5).

---

## 3. Strict State Machine Transitions
```
DISCOVERY ──> RESEARCH ──> ANALYSIS ──> PLANNING ──> IMPLEMENTATION ──> VALIDATION ──> DEBUGGING ──> REVIEW ──> COMPLETE
```
- **Implementation Gate**: Strictly blocked until `ARCHITECTURE_GATE = APPROVED`.
- **Review Gate**: Adversarial reviewer has full veto power across 13 dimensions.

---

## 4. Execution Output Structure
When executing `/EAF <prompt>`, render each phase explicitly:
1. **[TASK CLASSIFICATION & AGENT ROUTE]**
2. **[DISCOVERY FINDINGS]**
3. **[ASSUMPTION LEDGER]**
4. **[DECISION LEDGER & ARCHITECTURE PLAN]**
5. **[IMPLEMENTATION & WHY ANALYSIS]**
6. **[VALIDATION & TEST RESULTS]**
7. **[13-CATEGORY ADVERSARIAL REVIEW REPORT]**
8. **[FINAL VERIFICATION CHECKLIST]**
