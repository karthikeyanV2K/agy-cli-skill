---
name: review
version: "1.0.0"
description: "13 adversarial categories: correctness, security, performance, etc."
triggers: ["review", "audit", "security", "performance"]
target_agents: ["reviewer", "orchestrator"]
---

# Review Skill

## Purpose
This skill provides an adversarial audit framework across 13 engineering categories to catch bugs, architectural drift, vulnerabilities, and hardcoding before completion.

## Core Principles & Protocols
- **Adversarial Mindset**: Reviewer's role is to hunt for flaws, not merely say "looks good".
- **Reviewer May Veto**: Passing tests ≠ automatically correct code. Reviewer can reject even if all tests pass.
- **13 Review Categories**:
  1. **CORRECTNESS**: Logic matches requirements, handles all specified cases.
  2. **ARCHITECTURE**: Follows approved plan, preserves invariants, no unauthorized patterns.
  3. **EDGE CASES**: Null/empty/boundary/overflow/concurrent/partial failure handling.
  4. **ERROR HANDLING**: Errors propagated, logged, recoverable; no silent failures.
  5. **CONCURRENCY**: Race conditions, deadlocks, atomicity, thread safety.
  6. **SECURITY**: Injection, authz, secrets, crypto, supply chain, least privilege.
  7. **PERFORMANCE**: Complexity, allocations, latency, throughput, scaling.
  8. **RESOURCE MANAGEMENT**: Leaks, cleanup, RAII, connection pools, file handles.
  9. **COMPATIBILITY**: API stability, version constraints, platform differences.
  10. **TEST COVERAGE**: Unit/integration/e2e coverage, mutation testing, property tests.
  11. **MAINTAINABILITY**: Coupling, cohesion, naming, documentation, cognitive load.
  12. **HARDCODING**: Magic numbers, paths, URLs, credentials, env assumptions.
  13. **REGRESSION**: Existing tests pass, no removed coverage, no weakened asserts.

## Hardcoding Audit (Category 12)
Reviewer MUST flag:
- Magic numbers without justification
- Hardcoded paths, URLs, or credentials
- Environment or platform assumptions
- Fake configuration or temporary dev bypasses

## Expected Outputs
- `ReviewReport` documenting findings, severities, evidence (file:line), and recommendations across all 13 categories.
- Final `APPROVE` or `REJECT` decision with clear blockers listed.
