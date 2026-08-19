# Engineering Skill

## Purpose
This skill encompasses general software engineering practices for the kernel project including build systems, CI/CD, documentation, and developer tooling.

## Key Rules from Architecture Proposal
- **Automate Everything**: Build, test, lint, and deploy must be fully automated with zero manual steps
- **Fast Feedback**: CI pipeline must complete in under 10 minutes; optimize for iteration speed
- **Documentation as Code**: Keep docs in repo; generate from source where possible; version with code
- **Tooling Investment**: Build custom tools for repetitive kernel tasks (capability analysis, trace parsing, etc.)
- **Onboarding Optimized**: New contributors should build and test in under 30 minutes

## Trigger Conditions
- Setting up or modifying build systems (CMake, Meson, Bazel)
- CI/CD pipeline configuration and optimization
- Developer tooling creation or improvement
- Documentation structure and generation
- Contributor onboarding experience

## Expected Outputs
- Reproducible build configurations
- Fast, reliable CI pipelines with clear failure diagnostics
- Custom analysis and debugging tools
- Living documentation synchronized with code
- Streamlined contributor guides