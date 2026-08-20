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

### Subagent Roles, Functions & Tool Sets
| Subagent Role | Primary Function | Available Tools |
| :--- | :--- | :--- |
| 👑 **Orchestrator** | Enforces state machine transitions, budgets, and gate checks | Full Management (`spawn_agent`, `read_context`, `write_context`, `check_gates`, `enforce_budget`, `update_ledger`, `manage_subagents`, `invoke_subagent`, `send_message`, `schedule`) |
| 🏛️ **Architect** | Designs data flow, component boundaries, and mitigations | Read-Only / Planning (`read_codebase`, `search_code`, `read_docs`, `write_plan`, `verify_compatibility`, `view_file`, `find_by_name`, `grep_search`) |
| 💻 **Implementer** | Writes surgical, production-ready code matching plan | File Edit / Build (`read_file`, `write_file`, `edit_file`, `replace_file_content`, `run_build`, `run_tests`, `run_lint`, `run_command`) |
| 🐞 **Debugger** | Isolates root causes, reproduces bugs, forms hypotheses | Trace / Diagnostics (`read_logs`, `run_test`, `trace_execution`, `inspect_memory`, `read_registers`, `apply_patch`, `verify_fix`, `replace_file_content`, `run_command`, `view_file`, `grep_search`) |
| 🧪 **Tester** | Generates deterministic unit and integration test suites | Test Runners (`run_format`, `run_static_analysis`, `run_build`, `run_unit_tests`, `run_integration_tests`, `run_e2e_tests`, `run_security_scan`, `run_qemu`, `run_kernel_tests`, `measure_coverage`, `write_file`, `run_command`) |
| 🛡️ **Reviewer** | Executes 13-point adversarial review and security analysis | Static Analysis / Diff (`read_diff`, `static_analysis`, `security_scan`, `performance_profile`, `check_assumptions`, `check_decisions`, `audit_hardcoding`, `verify_regression_tests`, `view_file`, `grep_search`, `run_command`) |
| 🔍 **Researcher** | Queries official documentation and resolves knowledge gaps | Web Search / Docs (`search_codebase`, `search_web`, `read_url_content`, `read_official_docs`, `read_source_code`, `cross_validate`, `write_findings`, `find_by_name`, `grep_search`, `view_file`) |


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

## 4. Dynamic Caveman Budget System (Low Token, High Work)
Enforces high reasoning depth with minimum token overhead:
- **Complexity Tiers**:
  - `MINIMAL` (Doc / Format / CI): 1 Research, 1 Review, 2 Debug | 1,500 Thinking Tokens | 500 Max Output
  - `STANDARD` (Bug / Feature / Refactor): 2 Research, 2 Review, 3 Debug | 3,000 Thinking Tokens | 1,000 Max Output
  - `COMPLEX` (External API / Perf / Arch): 3 Research, 2 Review, 5 Debug | 4,000 Thinking Tokens | 1,500 Max Output
  - `EXTREME` (Kernel / Driver / Security): 4 Research, 3 Review, 6 Debug | 5,000 Thinking Tokens | 2,000 Max Output
- **Telegraphic Transmission**: Eliminate conversational fluff; communicate dense, verifiable technical facts (`[CONFIRMED] path:line`, `[DECISION] choice | reason | tradeoff`, `[PATCH] diff`).
- **Elastic Surplus Pool**: Unused rounds in upstream phases (e.g. Discovery/Research completing with 0 gaps) are automatically credited to downstream phases (Testing/Debug).
- **Fast-Path Bailouts**: 0 knowledge gaps in Discovery skips Research phase; 100% test pass on first build skips Debugger.

---

## 5. Execution Output Structure
When executing `/EAF <prompt>`, render each phase explicitly:
1. **[TASK CLASSIFICATION, COMPLEXITY TIER & AGENT ROUTE]**
2. **[DISCOVERY FINDINGS & TOKEN BUDGET STATUS]**
3. **[ASSUMPTION LEDGER]**
4. **[DECISION LEDGER & ARCHITECTURE PLAN]**
5. **[IMPLEMENTATION & WHY ANALYSIS]**
6. **[VALIDATION & TEST RESULTS]**
7. **[13-CATEGORY ADVERSARIAL REVIEW REPORT]**
8. **[FINAL VERIFICATION CHECKLIST & BUDGET SUMMARY]**

