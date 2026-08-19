# Contributing to AGY CLI

Thank you for your interest in contributing to AGY CLI! This document outlines the process for contributing to this project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/karth/agy-cli/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node/Python version, AGY CLI version)
   - Relevant logs or screenshots

### Suggesting Features

1. Check existing [Discussions](https://github.com/karth/agy-cli/discussions) and Issues
2. Create a new Discussion or Issue with:
   - Clear use case and motivation
   - Proposed solution (if any)
   - Alternative approaches considered
   - Impact on existing functionality

### Pull Request Process

1. **Fork** the repository
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following the coding standards below
4. **Test your changes** using AGY CLI itself (dogfooding):
   ```bash
   agy task "verify my changes work correctly"
   ```
5. **Run the test suite**:
   ```bash
   npm test
   # or
   pytest
   ```
6. **Submit a PR** with:
   - Clear title referencing the issue (e.g., "Fix #123: ...")
   - Description of changes
   - Screenshots/logs if applicable
   - Checklist of completed items

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript with strict mode
- Follow ESLint configuration (run `npm run lint`)
- Use Prettier for formatting (run `npm run format`)
- Write tests for new functionality
- Document public APIs with JSDoc

### Python

- Use type hints (mypy strict mode)
- Follow Ruff linting (run `ruff check`)
- Use Black for formatting (run `black .`)
- Write tests with pytest
- Document with docstrings (Google style)

### Markdown Documentation

- Use semantic line breaks (one sentence per line)
- Follow the existing documentation structure
- Include code examples for new features
- Update table of contents if adding sections

## Agent & Skill Development

When adding new agents or skills:

1. **Follow the permission model** — each agent must declare its permissions
2. **Add to the skill registry** — register in `src/skills/index.ts` or equivalent
3. **Write comprehensive tests** — including edge cases and failure modes
4. **Update documentation** — add to agent/skill reference docs
5. **Consider backward compatibility** — avoid breaking changes

## Testing Requirements

All contributions must include tests:

- **Unit tests** for individual functions/classes
- **Integration tests** for agent interactions
- **E2E tests** for complete workflows
- **Regression tests** for bug fixes

Run tests with:
```bash
# Full test suite
npm test

# Specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e

# With coverage
npm run test:coverage
```

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(orchestrator): add custom agent chain support
fix(researcher): handle rate limiting from API
docs(readme): update quick start guide
test(tester): add e2e test for review rejection
```

## Release Process

1. Maintainers create release branch: `release/vX.Y.Z`
2. Version bump in `package.json` / `pyproject.toml`
3. CHANGELOG.md updated
4. Tagged release: `git tag vX.Y.Z`
5. GitHub Release created with notes
6. Published to npm/PyPI

## Getting Help

- **Discord**: [AGY CLI Community](https://discord.gg/agy-cli) (placeholder)
- **Discussions**: [GitHub Discussions](https://github.com/karth/agy-cli/discussions)
- **Email**: karth@agy-cli.dev (placeholder)

## Recognition

Contributors are recognized in:
- [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Release notes
- Annual contributor highlights

Thank you for making AGY CLI better!