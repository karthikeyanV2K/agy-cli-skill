---
name: implementation
version: "1.0.0"
description: "Minimal-change rules, abstraction reuse, anti-hardcoding"
triggers: ["implement", "code", "write", "develop"]
target_agents: ["implementer", "debugger"]
---

# Implementation Skill

## Purpose
This skill guides the production of clean, robust, type-safe code that strictly adheres to the approved architecture plan and core engineering laws.

## Core Principles & Protocols
- **Minimal Changes**: Modify only the minimum required files to implement the feature or fix.
- **Reuse Existing Abstractions**: Leverage established patterns, utilities, and helper functions; never duplicate code needlessly.
- **Anti-Hardcoding Rule**: Never hardcode magic numbers, credentials, URLs, paths, or environment assumptions. Document any necessary domain constants.
- **The "WHY" Requirement**: For every modified file or function, be prepared to answer:
  - Why this file?
  - Why this function?
  - Why this approach?
  - Why this dependency?
- **Preserve Documentation**: Preserve existing comments, docstrings, and type definitions.

## Trigger Conditions
- Generating new code modules or modifying existing application code
- Implementing data models, APIs, handlers, and business logic
- Applying approved architecture plans or bugfix patches

## Expected Outputs
- Production-grade source code with explicit error handling
- Clean Git diffs without extraneous whitespace or formatting churn
- Documented rationale for modifications
