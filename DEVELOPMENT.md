# Development Guide

This guide covers setting up your development environment, building the
library, running tests, and contributing code to the AdGuard Scriptlets and
Redirect Resources library.

## Prerequisites

### Required Tools

| Tool | Version | Notes |
| ---- | ------- | ----- |
| [Node.js](https://nodejs.org/) | 22 | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| [pnpm](https://pnpm.io/) | 10.7 | Package manager |
| [Git](https://git-scm.com/) | Latest | Version control |

> **Note**: Development is tested on macOS and Linux. Windows users should use
> WSL or a virtual machine.

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/AdguardTeam/Scriptlets.git
cd Scriptlets
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build the Library

```bash
pnpm build
```

Build output goes to `dist/`.

### 4. Run Tests

```bash
# All tests (Vitest + smoke + QUnit)
pnpm test

# Vitest only (API, validators, converters)
pnpm test:vitest

# QUnit only (scriptlets)
pnpm test:qunit scriptlets

# QUnit only (redirects)
pnpm test:qunit redirects

# Single scriptlet with rebuild
pnpm test:qunit scriptlets --name <scriptlet-name> --build
```

### 5. Run Linters

```bash
# All linters
pnpm lint

# Individual linters
pnpm lint:code   # ESLint
pnpm lint:types  # TypeScript type checking
pnpm lint:md     # markdownlint
```

## Available Commands

| Command | Description |
| ------- | ----------- |
| `pnpm install` | Install dependencies |
| `pnpm build` | Clean `dist/` and build all bundles |
| `pnpm test` | Run all tests (Vitest + smoke + QUnit) |
| `pnpm test:vitest` | Run Vitest tests only (API, validators, converters) |
| `pnpm test:qunit scriptlets` | Run QUnit tests for all scriptlets |
| `pnpm test:qunit redirects` | Run QUnit tests for all redirects |
| `pnpm test:qunit helpers` | Run QUnit tests for helpers |
| `pnpm test:qunit scriptlets --name <name> --build` | Run a single scriptlet test with rebuild |
| `pnpm lint` | Run all linters |
| `pnpm lint:code` | Run ESLint |
| `pnpm lint:types` | Run TypeScript type checking (`tsc --noEmit`) |
| `pnpm lint:md` | Run markdownlint |
| `pnpm wiki:build-table` | Regenerate compatibility table |
| `pnpm wiki:build-docs` | Regenerate scriptlet/redirect wiki docs from JSDoc |
| `pnpm increment` | Bump patch version in `package.json` |

## Development Workflow

### Branching Strategy

1. Create a feature branch from `master`
2. Make your changes
3. Ensure all checks pass (see Before Committing below)
4. Submit a pull request to `master`

### Before Committing

Run these checks before every commit:

```bash
# Lint all (ESLint + TypeScript + markdownlint)
pnpm lint

# Run the relevant test suite
pnpm test:qunit scriptlets --name <name> --build  # for scriptlet changes
pnpm test:vitest                                  # for API/converter/validator changes
```

Both must pass with no errors.

## Spec-Driven Development (SDD)

All non-trivial changes must be guided by a spec authored **before**
implementation begins. SDD slash commands should be available globally (preferred).

### When to Use Each Flow

| Change type | Flow |
| ----------- | ---- |
| New scriptlet or redirect resource | Full SDD |
| API surface change | Full SDD |
| Multi-component refactor | Full SDD |
| Bug fix | Quick flow |
| Small config or single-file change | Quick flow |

### Specs Directory Layout

All specs are stored in `specs/.current/` (local-only, contents are gitignored)
and are never committed.

```text
specs/
├── .current/               # local only, gitignored contents
    ├── ADG-1234-new-scriptlet/
    │   ├── spec.md
    │   └── plan.md
    └── ADG-5678-bugfix/
        └── quick.md
```

## Common Tasks

### Adding a New Scriptlet

1. Run `/sdd-spec <scriptlet description>` then `/sdd-plan` to create the spec
   and plan.
2. Create `src/scriptlets/<name>.ts` with a JSDoc `@scriptlet` header.
3. Add a QUnit test file at `tests/scriptlets/<name>.test.js`.
4. Update `scripts/compatibility-table.json` with the new entry.
5. Run `pnpm test:qunit scriptlets --name <name> --build` to verify.
6. Run `pnpm wiki:build-docs` to regenerate the wiki documentation.

### Adding a New Redirect Resource

1. Run `/sdd-spec <redirect description>` then `/sdd-plan`.
2. Create the source file in `src/redirects/` and a YAML manifest alongside it.
3. Add a QUnit test file at `tests/redirects/<name>.test.js`.
4. Update `scripts/compatibility-table.json` with the new entry.
5. Run `pnpm test:qunit redirects --build` to verify.
6. Run `pnpm wiki:build-docs` to regenerate the wiki documentation.

### Updating Wiki Documentation

```bash
# Regenerate compatibility table
pnpm wiki:build-table

# Regenerate scriptlet/redirect docs from JSDoc
pnpm wiki:build-docs
```

> **Note**: Files in `wiki/` are auto-generated. Do **not** edit them manually.

### Bumping the Version

```bash
pnpm increment
```

This bumps the patch version in `package.json` without creating a git tag.
Update `CHANGELOG.md` accordingly before publishing.

## Additional Resources

- [AGENTS.md](AGENTS.md) — AI agent instructions and code guidelines
- [README.md](README.md) — Project overview and usage documentation
- [CHANGELOG.md](CHANGELOG.md) — Version history
- [AdGuard JavaScript Code Guidelines](https://github.com/AdguardTeam/CodeGuidelines/blob/master/JavaScript/Javascript.md)
