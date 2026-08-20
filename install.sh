#!/usr/bin/env bash
set -e

echo -e "\033[0;36m=========================================\033[0m"
echo -e "\033[0;36m AGY CLI Skill & /EAF Auto-Installer     \033[0m"
echo -e "\033[0;36m=========================================\033[0m"

SKILL_DIR="$HOME/.gemini/config/skills/agy-cli-skill"
RULE_DIR="$HOME/.gemini/config/rules"

mkdir -p "$SKILL_DIR" "$RULE_DIR" ".gemini/skills" ".gemini/rules"

if [ -d "$SKILL_DIR/.git" ]; then
    echo -e "\033[0;33mUpdating agy-cli-skill...\033[0m"
    git -C "$SKILL_DIR" pull
else
    echo -e "\033[0;33mCloning agy-cli-skill...\033[0m"
    git clone https://github.com/karthikeyanV2K/agy-cli-skill.git "$SKILL_DIR"
fi

if command -v npm >/dev/null 2>&1; then
    echo -e "\033[0;33mBuilding agy-cli-skill TypeScript engine...\033[0m"
    npm --prefix "$SKILL_DIR" install --silent
    npm --prefix "$SKILL_DIR" run build --silent
fi

cat << "EOF" > "$RULE_DIR/eaf-orchestrator.md"
# EAF Orchestrator Protocol Rule

When the user starts a request with `/EAF`, activate the Enterprise Agent Framework (EAF) Orchestrator Mode.

## 1. Task Classification & Agent Assignment
- `BUG`: CODEBASE -> DEBUGGER -> TESTER -> REVIEWER
- `FEATURE (internal)`: CODEBASE -> ARCHITECT -> IMPLEMENTER -> TESTER -> REVIEWER
- `FEATURE (external)`: RESEARCHER -> CODEBASE -> ARCHITECT -> IMPLEMENTER -> TESTER -> REVIEWER
- `REFACTOR`: CODEBASE -> ARCHITECT -> IMPLEMENTER -> TESTER -> REVIEWER
- `PERFORMANCE`: RESEARCHER -> CODEBASE -> ARCHITECT -> IMPLEMENTER -> TESTER -> DEBUGGER -> REVIEWER
- `SECURITY`: RESEARCHER -> CODEBASE -> ARCHITECT -> SECURITY_REVIEW -> IMPLEMENTER -> TESTER -> REVIEWER
- `ARCHITECTURE CHANGE`: RESEARCHER -> CODEBASE -> ARCHITECT -> SECURITY_REVIEW -> IMPLEMENTER -> TESTER -> DEBUGGER -> REVIEWER

## 2. State Machine Enforcement
`DISCOVERY -> RESEARCH -> ANALYSIS -> PLANNING -> IMPLEMENTATION -> VALIDATION -> DEBUGGING -> REVIEW -> COMPLETE`

## 3. Core Engineering Laws (AGENTS.md)
1. **Never Blindly Code**: Always inspect files and structure first.
2. **Explicit Knowledge States**: Enforce `CONFIRMED`, `VERIFIED`, `INFERRED`, `UNKNOWN`.
3. **Research Before Implementation**: High-impact unknowns block coding until researched.
4. **Decision Ledger**: Every architectural decision requires recorded options, rationale, and tradeoffs.
5. **Adversarial Review**: Passes a 13-point adversarial review before completion.
6. **Zero Unjustified Hardcoding**: No magic values, fake configs, or environment assumptions.
7. **Disciplined Failure Loops**: Reproduce -> Classify -> Root Cause -> Minimal Patch -> Retest.
8. **Final Verification Gate**: Strict 12-item pre-completion checklist.

## 4. Output Structure
Output step-by-step state transitions with Knowledge State Ledger, Decision Ledger, Implementation Diff, Validation Tests, and Adversarial Review Report.
EOF

cp "$RULE_DIR/eaf-orchestrator.md" ".gemini/rules/eaf-orchestrator.md"

echo -e "\n\033[0;32m Setup Complete! You can now use: /EAF <Prompt>\033[0m\n"
