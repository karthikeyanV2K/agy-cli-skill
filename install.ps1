$ErrorActionPreference = "Stop"
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " AGY CLI Skill & /EAF Auto-Installer     " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$skillDir = "$HOME\.gemini\config\skills\agy-cli-skill"
$ruleDir = "$HOME\.gemini\config\rules"

New-Item -ItemType Directory -Force -Path $skillDir, $ruleDir, ".gemini\skills", ".gemini\rules" | Out-Null

if (Test-Path "$skillDir\.git") {
    Write-Host "Updating agy-cli-skill..." -ForegroundColor Yellow
    git -C $skillDir pull
} else {
    Write-Host "Cloning agy-cli-skill..." -ForegroundColor Yellow
    git clone https://github.com/karthikeyanV2K/agy-cli-skill.git $skillDir
}

$ruleContent = @'
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
'@

Set-Content -Path "$ruleDir\eaf-orchestrator.md" -Value $ruleContent -Encoding utf8
Copy-Item -Force "$ruleDir\eaf-orchestrator.md" ".gemini\rules\eaf-orchestrator.md"

Write-Host "`n Setup Complete! You can now use: /EAF <Prompt>`n" -ForegroundColor Green
