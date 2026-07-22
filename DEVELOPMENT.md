# Development Guide

This guide covers setting up your development environment, building the
library, running tests, and contributing code to the AdGuard Scriptlets and
Redirect Resources library.

## Prerequisites

### Required Tools

| Tool      | Version           | Notes                        |
| --------- | ----------------- | ---------------------------- |
| [Node.js] | 22                | Use [nvm] to manage versions |
| [pnpm]    | >=10.33.4 and <11 | Package manager              |
| [Git]     | Latest            | Version control              |

> **Note**: Development is tested on macOS and Linux. Windows users should use
> WSL or a virtual machine.

[Node.js]: https://nodejs.org/
[nvm]: https://github.com/nvm-sh/nvm
[pnpm]: https://pnpm.io/
[Git]: https://git-scm.com/

## Getting Started

### 1. Clone the Repository

```bash
git clone git@github.com:AdGuardSoftwareLimited/ext-scriptlets.git
cd ext-scriptlets
```

> The canonical source lives in the private repo
> `AdGuardSoftwareLimited/ext-scriptlets`; it is mirrored to the public
> `AdguardTeam/Scriptlets` on every push to `master`.

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

| Command                                            | Description                                         |
| -------------------------------------------------- | --------------------------------------------------- |
| `pnpm install`                                     | Install dependencies                                |
| `pnpm build`                                       | Clean `dist/` and build all bundles                 |
| `pnpm test`                                        | Run all tests (Vitest + smoke + QUnit)              |
| `pnpm test:vitest`                                 | Run Vitest tests only (API, validators, converters) |
| `pnpm test:qunit scriptlets`                       | Run QUnit tests for all scriptlets                  |
| `pnpm test:qunit redirects`                        | Run QUnit tests for all redirects                   |
| `pnpm test:qunit helpers`                          | Run QUnit tests for helpers                         |
| `pnpm test:qunit scriptlets --name <name> --build` | Run a single scriptlet test with rebuild            |
| `pnpm lint`                                        | Run all linters                                     |
| `pnpm lint:code`                                   | Run ESLint                                          |
| `pnpm lint:types`                                  | Run TypeScript type checking (`tsc --noEmit`)       |
| `pnpm lint:md`                                     | Run markdownlint                                    |
| `pnpm wiki:build-table`                            | Regenerate compatibility table                      |
| `pnpm wiki:build-docs`                             | Regenerate scriptlet/redirect wiki docs from JSDoc  |

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

### Releasing

Releases are driven by `CHANGELOG.md` and GitHub Actions; `package.json` has no
`version` field (it is injected at build time).

Clean local builds do not modify `package.json`. They derive a development
version by incrementing the patch component of the latest released
`CHANGELOG.md` heading and appending `-dev`. CI uses the shared
`set-dev-version` action to stamp that same development version before Docker
packaging. Release publication stamps the exact version selected by the
Prepare release workflow.

1. Ensure the changes are listed under `## [Unreleased]` in `CHANGELOG.md`.
2. Run the **Prepare release** workflow (`workflow_dispatch`) with the target
   tag (e.g. `v2.5.0`). It opens a release PR that moves `[Unreleased]` into a
   dated `## [x.y.z]` section.
3. Merge the release PR. **Publish release** then tags the commit, builds and
   tests in Docker, publishes `@adguard/scriptlets` to npm, mirrors to
   `AdguardTeam/Scriptlets`, drafts a GitHub Release, and notifies Slack.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the release parameters.

## Additional Resources

- [AGENTS.md](AGENTS.md) — AI agent instructions and code guidelines
- [README.md](README.md) — Project overview and usage documentation
- [CHANGELOG.md](CHANGELOG.md) — Version history
- [AdGuard JavaScript Code Guidelines](https://github.com/AdguardTeam/CodeGuidelines/blob/master/JavaScript/Javascript.md)
