---
name: architecture
version: "1.0.0"
description: "Design gates, data flow, dependency analysis, compatibility"
triggers: ["architecture", "design", "architect", "system"]
target_agents: ["architect", "orchestrator", "reviewer"]
---

# Architecture Skill

## Purpose
This skill provides guidance for system architecture design, component blueprints, data and control flow definitions, and maintenance of the Decision Ledger.

## Core Principles & Protocols
- **Isolation & Boundary Design**: Design clear modular boundaries, failure domains, and interface contracts.
- **Explicit Contracts**: Define interfaces with explicit preconditions, postconditions, and invariants.
- **Minimal Complexity & TCB**: Minimize dependencies, complexity, and attack surface.
- **Decision Ledger**: Every architecture decision must record:
  - Question being decided
  - Options considered (A, B, C)
  - Selected option
  - Evidence-based rationale
  - Tradeoffs acknowledged
- **Architecture Gate**: Architecture plan must be `APPROVED` before implementation starts.

## Trigger Conditions
- Designing new subsystems, modules, or network/IPC protocols
- Planning major refactors, migration strategies, or schema migrations
- Evaluating trade-offs between performance, scalability, and maintainability
- Establishing interface boundaries and domain models

## Expected Outputs
- `ArchitecturePlan` containing:
  - Goal and Current Architecture
  - Affected Components
  - Data Flow & Control Flow diagrams
  - Implementation Strategy & Alternatives
  - Failure Modes & Mitigations
  - Testing Strategy
- Decision Ledger entries (`DECISION D001...`)
