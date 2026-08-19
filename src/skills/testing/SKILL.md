# Testing Skill

## Purpose
This skill defines testing strategies for kernel correctness including unit, integration, property-based, and fault injection testing.

## Key Rules from Architecture Proposal
- **Test at the Boundary**: Focus on syscall interfaces, IPC boundaries, and capability transitions
- **Property-Based by Default**: Use model checking and property-based testing for stateful subsystems
- **Fault Injection Mandatory**: Test every error path with injected failures (OOM, disk errors, signal storms)
- **Deterministic Replay**: All tests must be replayable with fixed seeds; no flaky tests
- **Coverage with Intent**: Measure branch coverage on error paths, not just happy paths

## Trigger Conditions
- Adding new syscalls, IPC protocols, or capability operations
- Modifying scheduler, memory manager, or VFS
- Implementing checkpoint/restore or COW
- Validating security properties (isolation, non-interference)

## Expected Outputs
- Test suites with property-based generators
- Fault injection harnesses
- CI pipeline integration
- Formal verification artifacts where applicable