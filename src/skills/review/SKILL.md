# Review Skill

## Purpose
This skill provides structured code review practices for kernel changes focusing on correctness, security, and maintainability.

## Key Rules from Architecture Proposal
- **Checklist-Driven**: Use explicit review checklists for isolation, error handling, locking, and lifetimes
- **Question Assumptions**: Challenge implicit invariants; require explicit documentation of assumptions
- **Minimal Diffs**: Prefer small, focused changes; reject large refactors without incremental justification
- **Security Lens**: Every review must consider capability leaks, TOCTOU, and side-channel implications
- **Knowledge Transfer**: Reviews should teach; explain reasoning, not just approve/reject

## Trigger Conditions
- Any kernel code change (C, assembly, linker scripts, build config)
- Capability system modifications
- Memory management or scheduler changes
- New IPC mechanisms or syscall additions

## Expected Outputs
- Review comments with specific line references
- Checklist completion status
- Alternative approach suggestions with trade-offs
- Follow-up task tracking for deferred issues