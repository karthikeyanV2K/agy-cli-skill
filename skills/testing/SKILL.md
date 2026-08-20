---
name: testing
version: "1.0.0"
description: "Six validation levels with project-appropriate selection"
triggers: ["test", "validate", "verify", "check"]
target_agents: ["tester", "validator", "orchestrator"]
---

# Testing Skill

## Purpose
This skill defines multi-level validation strategies, test design best practices, and deterministic test execution for software quality assurance.

## Core Principles & Protocols
- **Validation Levels**:
  ```
  FORMAT → STATIC ANALYSIS → BUILD → UNIT TEST → INTEGRATION TEST → E2E TEST → REGRESSION TEST
  ```
- **Testing by Change Type**:
  - *Refactor*: Format, Static, Build, Unit, Regression
  - *New Feature*: Format, Static, Build, Unit, Integration, Regression
  - *External API*: Format, Static, Build, Unit, Integration, E2E, Regression
  - *Security Fix*: Format, Static, Build, Unit, Integration, Security Scan, Regression
- **Deterministic & Isolated**: Tests must not depend on execution order, network availability (mocked), or global mutable state.
- **Boundary & Negative Testing**: Test null values, empty collections, maximum boundaries, invalid inputs, and simulated failure modes.

## Trigger Conditions
- Adding tests for new features or bug reproductions
- Running validation gates following implementation
- Checking regression across existing test suites

## Expected Outputs
- Comprehensive unit and integration test suites
- Test execution reports with coverage metrics
- Regression test cases covering reported bugs
