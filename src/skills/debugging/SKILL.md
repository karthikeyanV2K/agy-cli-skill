---
name: debugging
version: "1.0.0"
description: "CLASSIFY→REPRODUCE→LOCATE→HYPOTHESIZE→PATCH→RETEST"
triggers: ["debug", "fix", "error", "failure", "bug"]
target_agents: ["debugger", "implementer"]
---

# Debugging Skill

## Purpose
This skill enforces disciplined, hypothesis-driven root cause analysis and deterministic reproduction for bug fixes and test failures.

## Core Principles & Protocols
- **Failure Loop Discipline (MANDATORY)**:
  `TEST FAILURE → CLASSIFY → REPRODUCE → LOCATE ROOT CAUSE → FORM HYPOTHESIS → PATCH → RETEST`
- **Never Randomly Code**: Avoid trial-and-error changes. Every patch must be justified by an empirical hypothesis.
- **Root Cause Protocol Output**:
  - **Observed failure**: Exact error message, exit code, or unexpected behavior
  - **Expected**: Intended behavior per specifications
  - **Actual**: What the system actually did
  - **Root cause**: Precise mechanism causing the defect
  - **Evidence**: Stack traces, log lines, memory states, code locations
  - **Fix**: Minimal targeted patch
  - **Why this fixes root cause**: Explanation of why the fix addresses the root cause rather than symptoms

## Trigger Conditions
- Test suite failures or assertion errors
- Runtime exceptions, crashes, or deadlocks
- Performance regressions and race conditions
- Unexpected behavioral discrepancies

## Expected Outputs
- Minimal, deterministic reproduction test case
- Root cause analysis with evidence chain
- Minimal targeted fix addressing root cause
- Verified green test suite confirming resolution without regression
