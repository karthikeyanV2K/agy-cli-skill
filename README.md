# AGY CLI — Antigravity Engineering Agent Framework

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)](https://github.com/karth/agy-cli)
[![GitHub Stars](https://img.shields.io/github/stars/karth/agy-cli?style=social)](https://github.com/karth/agy-cli/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/karth/agy-cli)](https://github.com/karth/agy-cli/issues)
[![Last Commit](https://img.shields.io/github/last-commit/karth/agy-cli)](https://github.com/karth/agy-cli/commits/main)

> **AGY CLI** is a production-grade, multi-agent orchestration framework that brings rigorous software engineering discipline to AI-assisted development. Built on a **Research → Plan → Implement → Verify → Review** pipeline with specialized agents, skills, and verification gates.

---

## 🎯 Why AGY CLI?

Most AI coding tools generate code first, think later. **AGY CLI reverses that** — enforcing a disciplined engineering workflow where **no implementation begins until research, architecture, and knowledge gaps are resolved**.

| Traditional AI Coding | AGY CLI Approach |
|----------------------|------------------|
| ❌ Guess → Code → Debug | ✅ Research → Plan → Implement → Verify |
| ❌ Single model, single prompt | ✅ Specialized agents with distinct permissions |
| ❌ No verification gates | ✅ Architecture gate, Test gate, Review gate |
| ❌ Hardcoded assumptions | ✅ Assumption ledger + Decision ledger |
| ❌ "Looks good" reviews | ✅ Adversarial review with REJECT power |

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    User[USER TASK] --> Orch[ORCHESTRATOR]
    Orch --> Decompose[DECOMPOSE TASK]
    Decompose --> Codebase[CODEBASE ANALYSIS]
    Decompose --> Research[KNOWLEDGE RESEARCH]
    Codebase --> CrossValidate[CROSS VALIDATE]
    Research --> CrossValidate
    CrossValidate --> Architect[ARCHITECTURE GATE]
    Architect --> Implement[IMPLEMENTATION]
    Implement --> Test[TEST & VALIDATION]
    Test -->|PASS| Review[ADVERSARIAL REVIEW]
    Test -->|FAIL| Debug[DEBUGGER → RE-TEST]
    Debug --> Test
    Review -->|PASS| Complete[FINISH]
    Review -->|REJECT| Implement
```

### Core Principles

| Principle | Description |
|-----------|-------------|
| **DISCOVER → RESEARCH → REASON → PLAN → IMPLEMENT → VERIFY → REVIEW** | Seven-phase engineering lifecycle |
| **No Implementation Before Research Gate** | Knowledge gaps = blocker, not guesswork |
| **Specialized Agent Permissions** | Researcher reads only, Implementer writes, Reviewer rejects |
| **Assumption Ledger** | Every assumption tracked: CONFIRMED / VERIFIED / INFERRED / UNKNOWN |
| **Decision Ledger** | Architectural choices documented with tradeoffs |
| **Configurable Budgets** | Research rounds, review rounds, debug iterations |

---

## 🤖 Agent Roster

| Agent | Role | Permissions | Key Responsibility |
|-------|------|-------------|-------------------|
| **Orchestrator** | Central coordinator | READ, PLAN, SPAWN | Task decomposition, agent assignment, progress monitoring |
| **Researcher** | Knowledge investigator | READ, SEARCH, EXECUTE | Authoritative source lookup, API verification, gap analysis |
| **Architect** | System designer | READ, SEARCH, PLAN | Architecture plans, data/control flow, failure mode analysis |
| **Implementer** | Code producer | READ, WRITE, EXECUTE | Minimal changes, reuse abstractions, no hardcoding |
| **Tester** | Validation engineer | READ, WRITE (tests), EXECUTE | Multi-level validation: format → static → unit → integration → e2e |
| **Debugger** | Root cause analyst | READ, WRITE, EXECUTE | Hypothesis-driven debugging, evidence-based fixes |
| **Reviewer** | Adversarial auditor | READ, SEARCH, EXECUTE, REJECT | 13-category review, can REJECT even with passing tests |

---

## 🛠️ Skill System

| Skill | Purpose |
|-------|---------|
| **Engineering** | Master rules: DISCOVER→RESEARCH→REASON→PLAN→IMPLEMENT→VERIFY→REVIEW |
| **Research** | Targeted knowledge acquisition from authoritative sources |
| **Architecture** | Design gates, data flow, dependency analysis, compatibility |
| **Implementation** | Minimal-change rules, abstraction reuse, anti-hardcoding |
| **Debugging** | CLASSIFY→REPRODUCE→LOCATE→HYPOTHESIZE→PATCH→RETEST |
| **Testing** | Six validation levels with project-appropriate selection |
| **Review** | 13 adversarial categories: correctness, security, performance, etc. |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** or **Python 3.10+**
- **Git** for version control
- **GitHub CLI (`gh`)** for repository management (optional but recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/karth/agy-cli.git
cd agy-cli

# Install dependencies (Node.js)
npm install

# OR install dependencies (Python)
pip install -r requirements.txt
```

### Configuration

Create a `.agyrc` configuration file:

```yaml
# .agyrc
orchestrator:
  model: "claude-4-5-sonnet"
  max_concurrent_agents: 4
  research_budget:
    max_rounds: 3
  review_budget:
    max_rounds: 2
  debug_budget:
    max_iterations: 5

agents:
  researcher:
    permissions: [read, search, execute]
  architect:
    permissions: [read, search, plan]
  implementer:
    permissions: [read, write, execute]
  tester:
    permissions: [read, write:tests, execute]
  reviewer:
    permissions: [read, search, execute, reject]
  debugger:
    permissions: [read, write, execute]

skills:
  - engineering
  - research
  - architecture
  - implementation
  - debugging
  - testing
  - review
```

### Running AGY CLI

```bash
# Basic task execution
agy task "implement user authentication with JWT"

# With specific agent chain
agy task "refactor database layer" --agents researcher,architect,implementer,tester,reviewer

# Verbose output with budget tracking
agy task "add rate limiting" --verbose --budget-tracking

# Dry run (plan only, no implementation)
agy task "migrate to TypeScript" --dry-run
```

---

## 📁 Project Structure

```
agy-cli/
├── AGENTS.md                    # Project-wide mandatory rules
├── README.md                    # This file
├── .agyrc                       # Configuration (create from .agyrc.example)
├── src/
│   ├── agents/                  # Agent implementations
│   │   ├── orchestrator.ts
│   │   ├── researcher.ts
│   │   ├── architect.ts
│   │   ├── implementer.ts
│   │   ├── debugger.ts
│   │   ├── tester.ts
│   │   └── reviewer.ts
│   └── skills/                  # Skill definitions
│       ├── engineering/
│       ├── research/
│       ├── architecture/
│       ├── implementation/
│       ├── debugging/
│       ├── testing/
│       └── review/
└── .agents/                     # Agent & skill specs (Markdown)
    ├── agents/
    │   ├── orchestrator/
    │   ├── researcher/
    │   ├── architect/
    │   ├── implementer/
    │   ├── debugger/
    │   ├── tester/
    │   └── reviewer/
    ├── skills/
    │   ├── engineering/
    │   ├── research/
    │   ├── architecture/
    │   ├── implementation/
    │   ├── debugging/
    │   ├── testing/
    │   └── review/
    └── policies/
```

---

## 🔧 Advanced Usage

### Custom Agent Chains

```bash
# Security-focused workflow
agy task "audit authentication flow" \
  --chain researcher,architect,security-reviewer,implementer,tester

# Performance optimization
agy task "optimize query latency" \
  --chain researcher,architect,implementer,tester,profiler

# Kernel/driver development
agy task "add PCIe driver support" \
  --chain researcher,codebase-analyst,architect,security-reviewer,implementer,tester,debugger,reviewer
```

### Knowledge State Tracking

AGY CLI explicitly tracks knowledge states:

```bash
# View assumption ledger
agy assumptions list

# Check for UNKNOWN high-impact assumptions
agy assumptions check --high-impact

# View decision ledger
agy decisions list
```

### Budget Management

```bash
# Set custom budgets
agy config set research_budget.max_rounds 5
agy config set review_budget.max_rounds 3
agy config set debug_budget.max_iterations 10

# View current budgets
agy config show budgets
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [AGENTS.md](AGENTS.md) | Project-wide mandatory rules for all agents |
| [Architecture Guide](docs/architecture.md) | Detailed system architecture |
| [Agent Development](docs/agents.md) | Creating custom agents |
| [Skill Development](docs/skills.md) | Building custom skills |
| [Configuration Reference](docs/config.md) | Complete `.agyrc` reference |
| [API Reference](docs/api.md) | Programmatic API documentation |

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/agy-cli.git
cd agy-cli

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes with AGY CLI dogfooding
agy task "add amazing feature"

# Run tests
npm test

# Submit PR
gh pr create --title "Add amazing feature" --body "Description..."
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=karth/agy-cli&type=Date)](https://star-history.com/#karth/agy-cli&Date)

---

## 🔗 Links

- **GitHub Repository**: https://github.com/karth/agy-cli
- **Issues & Bug Reports**: https://github.com/karth/agy-cli/issues
- **Discussions**: https://github.com/karth/agy-cli/discussions
- **Releases**: https://github.com/karth/agy-cli/releases

---

## 🙏 Acknowledgments

- Inspired by rigorous software engineering practices from kernel development, aerospace, and high-assurance systems
- Built for developers who believe **AI should amplify engineering discipline, not replace it**
- Special thanks to the Warp/Oz platform for orchestration primitives

---

<div align="center">

**Made with ❤️ for engineers who care about correctness**

[⬆ Back to Top](#agy-cli--antigravity-engineering-agent-framework)

</div>