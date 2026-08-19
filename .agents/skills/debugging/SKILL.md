# Debugging Skill

## Purpose
This skill provides systematic approaches for debugging kernel issues including panics, deadlocks, memory corruption, and performance regressions.

## Key Rules from Architecture Proposal
- **Reproduce First**: Never debug without a reliable reproduction case
- **Bisect Relentlessly**: Use git bisect, hardware watchpoints, and temporal logging to narrow scope
- **State Reconstruction**: Build complete system state snapshots (registers, page tables, capability tables) at failure points
- **Hypothesis-Driven**: Form falsifiable hypotheses; test one variable at a time
- **Instrument Strategically**: Add minimal, targeted logging/tracing; avoid Heisenbugs from over-instrumentation

## Trigger Conditions
- Kernel panics, triple faults, or silent data corruption
- Deadlocks in scheduler, IPC, or memory reclaim
- Performance regressions in critical paths
- Capability check failures or permission violations

## Expected Outputs
- Root cause analysis with evidence chain
- Minimal reproduction test cases
- Fix patches with regression tests
- Post-mortem documentation for prevention