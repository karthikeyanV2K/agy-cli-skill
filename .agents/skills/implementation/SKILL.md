# Implementation Skill

## Purpose
This skill guides low-level kernel implementation including assembly, C, memory management, and syscall handling.

## Key Rules from Architecture Proposal
- **Correctness Over Cleverness**: Prefer clear, verifiable code over optimized but opaque implementations
- **Explicit Error Handling**: Every fallible operation must have a documented error path
- **Assembly Discipline**: Use inline assembly sparingly; prefer separate .s files with clear interfaces
- **Memory Safety**: Enforce ownership and lifetime rules; use compile-time checks where possible
- **Syscall Hygiene**: Validate all user inputs at syscall entry; never trust userspace pointers

## Trigger Conditions
- Writing or reviewing kernel C/assembly code
- Implementing syscalls, IPC, or memory management
- Debugging CR3 switches, page faults, or context switches
- Adding COW, checkpoint/restore, or budgeting features

## Expected Outputs
- Production-ready kernel patches with tests
- Assembly routines with detailed comments
- Syscall implementations with full validation
- Memory management invariants documented