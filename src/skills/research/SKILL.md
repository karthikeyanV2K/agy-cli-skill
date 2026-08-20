---
name: research
version: "1.0.0"
description: "Targeted knowledge acquisition from authoritative sources"
triggers: ["research", "investigate", "knowledge", "gap"]
target_agents: ["researcher", "orchestrator", "architect"]
---

# Research Skill

## Purpose
This skill provides capabilities for conducting deep technical research, codebase exploration, official API/spec verification, and targeted knowledge acquisition.

## Core Principles & Protocols
- **Systematic Exploration**: Survey repository structure, patterns, and dependencies before making assertions.
- **Source Verification & Priority**:
  1. Repository code (highest priority)
  2. Official documentation
  3. Official source code
  4. Standards / specifications (RFC, ISO, W3C)
  5. Maintainer documentation
  6. High-quality technical references (MSDN, kernel.org)
  7. Community discussions (StackOverflow, Reddit - lowest priority, cite with caution)
- **Knowledge States**: Classify all findings as `CONFIRMED`, `VERIFIED`, `INFERRED`, or `UNKNOWN`.
- **Targeted Research Flow**:
  `IDENTIFY GAP → FORM SPECIFIC QUESTION → SEARCH AUTHORITATIVE SOURCE → READ MATERIAL → EXTRACT FACT → CROSS-VALIDATE → APPLY`

## Trigger Conditions
- Resolving knowledge gaps during DISCOVERY or RESEARCH phases
- Investigating third-party APIs, library versions, and protocol specifications
- Evaluating design alternatives, tradeoffs, and risks
- Investigating bug root causes requiring external or historical context

## Expected Outputs
- Structured research reports with explicit citations
- Annotated code references with exact line numbers
- Comparative analysis tables for design alternatives
- High-impact gap resolution preventing architectural blockage
