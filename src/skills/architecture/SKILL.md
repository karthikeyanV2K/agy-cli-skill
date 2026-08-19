# Architecture Skill

## Purpose
This skill provides guidance for system architecture design, review, and decision-making in microkernel development.

## Key Rules from Architecture Proposal
- **Isolation First**: Design for strong isolation boundaries (CR3, capability-based) from the start
- **Explicit Contracts**: Define clear interfaces with explicit pre/post conditions and invariants
- **Minimal TCB**: Keep the trusted computing base as small as possible
- **Composability**: Favor composition over inheritance; components should be independently testable
- **Failure Containment**: Design failure domains that prevent cascading failures

## Trigger Conditions
- Designing new kernel subsystems or IPC mechanisms
- Reviewing architectural changes to memory management, scheduling, or capabilities
- Evaluating trade-offs between performance and isolation
- Planning capability system extensions

## Expected Outputs
- Architecture decision records (ADRs)
- Component interface specifications
- Threat models and security analyses
- Performance isolation guarantees