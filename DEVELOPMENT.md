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
[Conventional Commits]: https://www.conventionalcommits.org/en/v1.0.0/

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

> **Note on the `basic-ftp` override**: `package.json` pins the transitive
> `basic-ftp` dependency to the security-fixed `5.2.1` via `pnpm.overrides`.
> It is not declared in any manifest directly — it comes in through Puppeteer's
> proxy chain (`get-uri` → `pac-proxy-agent`), which QUnit tests use. When this
> override can be dropped: once the upstream chain resolves `basic-ftp@>=5.2.1`
> on its own (check `pnpm why basic-ftp`), remove the entry from `overrides`.

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
| `pnpm test:qunit:build`                            | Build QUnit test bundles (CI split-stage)           |
| `pnpm test:qunit:run`                              | Run QUnit tests without rebuilding (CI split-stage) |
| `pnpm tgz`                                         | Pack `scriptlets.tgz` (needs a version)             |
| `pnpm lint`                                        | Run all linters                                     |
| `pnpm lint:code`                                   | Run ESLint                                          |
| `pnpm lint:types`                                  | Run TypeScript type checking (`tsc --noEmit`)       |
| `pnpm lint:md`                                     | Run markdownlint                                    |
| `pnpm wiki:build-table`                            | Regenerate compatibility table                      |
| `pnpm wiki:build-docs`                             | Regenerate scriptlet/redirect wiki docs from JSDoc  |

> **Note**: `pnpm tgz` (and `pnpm pack`) need a version in `package.json`,
> which ships versionless. CI stamps the dev version via the shared
> `set-dev-version` action before packaging; locally you must stamp it first
> (mirroring `tests/smoke/exports/test.sh`), otherwise `pnpm tgz` fails with
> `ERR_PNPM_PACKAGE_VERSION_NOT_FOUND`.

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

### Commit Message Convention

Commit messages MUST follow the [Conventional Commits] specification. Use the most specific type that applies:

- `feat:` — new functionality
- `fix:` — bug fix
- `docs:` — documentation-only changes, including regenerated auto-generated docs such as `wiki/`
- `refactor:` — code changes that neither fix a bug nor add a feature
- `chore:` — changes that do not modify source or tests (e.g. tooling)
- `ci:` — CI configuration and scripts

Keep the subject short and imperative, e.g. `docs: regenerate wiki docs for release`.

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
`CHANGELOG.md` heading and appending `-dev`. CI stamps that same development
version via the shared `set-dev-version` action before Docker packaging.

Developer preconditions before requesting a release:

1. Ensure the changes are listed under `## [Unreleased]` in `CHANGELOG.md`.
2. If a release adds new scriptlets/redirects, resolve the `@added unknown`
   wiki-version TODO at the top of `CHANGELOG.md` for the target version (the
   wiki is regenerated from JSDoc during the release flow).

For the full release flow (Prepare release PR → merge → Publish release), see
[DEPLOYMENT.md](DEPLOYMENT.md).

## Additional Resources

- [AGENTS.md](AGENTS.md) — AI agent instructions and code guidelines
- [README.md](README.md) — Project overview and usage documentation
- [CHANGELOG.md](CHANGELOG.md) — Version history
- [AdGuard JavaScript Code Guidelines](https://github.com/AdguardTeam/CodeGuidelines/blob/master/JavaScript/Javascript.md)
