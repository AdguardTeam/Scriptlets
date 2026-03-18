# AGENTS.md

## Project overview

AdGuard's JavaScript library of Scriptlets and Redirect resources, providing
extended capabilities for content blocking. Scriptlets are small JavaScript
functions injected into web pages via declarative filter rules. Redirect
resources substitute network requests with local no-op or stub responses.
The library also exposes APIs for rule validation, conversion between
AdGuard/uBO/ABP syntaxes, and compatibility metadata.

## Table of contents

- [Technical context](#technical-context)
- [Project structure](#project-structure)
- [Build and test commands](#build-and-test-commands)
- [Contribution instructions](#contribution-instructions)
- [Code guidelines](#code-guidelines)
    - [I. Architecture](#i-architecture)
    - [II. Code quality standards](#ii-code-quality-standards)
    - [III. Testing discipline](#iii-testing-discipline)
    - [IV. Other](#iv-other)

## Technical Context

- **Language and version**: TypeScript 5.x and JavaScript (mixed codebase),
  compiled via Babel + Rollup
- **Primary dependencies**: `@adguard/agtree` (rule parsing), `js-yaml`
  (redirect manifests)
- **Storage**: None
- **Testing**: QUnit (scriptlets, redirects, helpers — browser-level via
  Puppeteer) and Vitest (API, validators, converters — jsdom)
- **Target platform**: Browser extension and Corelibs
- **Project type**: single
- **Performance goals**: N/A
- **Constraints**: Array destructuring is forbidden in `src/` — Babel's
  `_slicedToArray` helper is not available in the bundled runtime
- **Scale/scope**: Used by AdGuard products (CoreLibs, Browser Extension,
  Safari, iOS) and filter list maintainers

## Project structure

```text
scriptlets/
├── scripts/                  # Build and utility scripts (build, test, wiki)
├── src/
│   ├── converters/           # Rule syntax converters (ADG ↔ UBO ↔ ABP)
│   ├── helpers/              # Shared utilities used by scriptlets/redirects
│   ├── redirects/            # Redirect resource source files + YAML manifests
│   │   └── blocking-redirects/  # Blocking redirect resources (click2load)
│   ├── scriptlets/           # Individual scriptlet source files (.js/.ts)
│   ├── validators/           # Rule validation functions
│   └── index.ts              # Main public API entry point
├── tests/
│   ├── api/                  # Vitest tests for converters and validators
│   ├── helpers/              # QUnit tests for helper utilities
│   ├── redirects/            # QUnit tests for redirect resources
│   ├── scriptlets/           # QUnit tests for scriptlets
│   └── smoke/                # Smoke tests for ESM exports
├── types/                    # Ambient type declarations
├── wiki/                     # Auto-generated documentation (scriptlet/redirect docs, compatibility table)
├── .eslintrc.cjs             # ESLint configuration
├── .markdownlint.json        # Markdownlint configuration
├── rollup.config.js          # Rollup bundle configuration
├── tsconfig.json             # TypeScript configuration
├── vitest.config.ts          # Vitest configuration
├── DEVELOPMENT.md            # Development guide and SDD lifecycle
└── package.json              # Package manifest and scripts
```

## Build and test commands

- `pnpm install` — install dependencies
- `pnpm build` — clean `dist/` and build all bundles
- `pnpm test` — run all tests (Vitest + smoke + QUnit)
- `pnpm test:vitest` — run Vitest tests only (API, validators, converters)
- `pnpm test:qunit scriptlets` — run QUnit tests for all scriptlets
- `pnpm test:qunit redirects` — run QUnit tests for all redirects
- `pnpm test:qunit helpers` — run QUnit tests for helpers
- `pnpm test:qunit scriptlets --name <name> --build` — run a single
  scriptlet test with a rebuild
- `pnpm lint` — run all linters (`lint:code` + `lint:types` + `lint:md`)
- `pnpm lint:code` — run ESLint
- `pnpm lint:types` — run TypeScript type checking (`tsc --noEmit`)
- `pnpm lint:md` — run markdownlint
- `pnpm wiki:build-table` — regenerate compatibility table
- `pnpm wiki:build-docs` — regenerate scriptlet/redirect wiki docs from JSDoc

## Contribution instructions

You MUST follow the following rules for EVERY task that you perform:

- You MUST verify your changes pass all static analysis checks before completing
  a task:
    - `pnpm lint:code` to run ESLint
    - `pnpm lint:types` to check TypeScript types
    - `pnpm lint:md` to check Markdown formatting

- You MUST update or add unit tests for any changed code.

- You MUST run the test suite to verify your changes do not break existing
  functionality. For scriptlet/redirect changes use
  `pnpm test:qunit scriptlets --name <name> --build` (or `redirects`).
  For API/validator/converter changes use `pnpm test:vitest`.

- When making changes to the project structure, ensure the Project structure
  section in `AGENTS.md` is updated and remains valid.

- When the task is finished update `CHANGELOG.md` file and explain changes in
  the `Unreleased` section. Add entries to the appropriate subsection (`Added`,
  `Changed`, or `Fixed`) if it already exists; do not create duplicate
  subsections. Changes limited to `bamboo-specs/` or CI configuration,
  e.g. `Dockerfile`, may skip CHANGELOG updates.

- When modifying Bamboo specs (`bamboo-specs/*.yaml`), **EVERY job that invokes
  `docker build` or `docker run` MUST include** `requirements:` with
  `extension: 'true'`. This pins jobs to Docker-capable extension agents.

  **Critical**: Not pinning the agent type will cause the plan to land on a
  non-Docker-capable agent and fail unpredictably.

  **Required YAML structure** (at the job level, after `artifacts:` or `final-tasks:`):

  ```yaml
  JobName:
    key: JOBKEY
    tasks:
      - script:
          scripts:
            - docker build ...
    requirements:
      - extension: 'true'
  ```

  **Verification checklist** after modifying any `bamboo-specs/*.yaml`:
  1. Search for all occurrences of `docker build` or `docker run`
  2. For each job containing Docker commands, verify `requirements:` block exists
  3. Confirm each `requirements:` contains exactly `- extension: 'true'`
  4. Do NOT add any other requirements

  **Applies to**: Every job in `bamboo-specs/build.yaml`, `bamboo-specs/test.yaml`,
  `bamboo-specs/deploy.yaml`, and any other specs that use Docker.

  **Note**: This is an implicit contract with the infrastructure.
  If an extension agent is misconfigured or lacks Docker, CI will fail —
  and this is acceptable and preferred over silently using a non-Docker environment.

  **Note**: As of the latest revision, **every** job in `bamboo-specs/build.yaml`,
  `bamboo-specs/test.yaml`, and `bamboo-specs/deploy.yaml` already contains a
  correct `requirements:` block. All existing `requirements:` blocks MUST NOT be
  removed or modified. Before reporting a missing `requirements:` block in a
  review, **always read the actual file contents** — do not rely on diff context
  alone, as the block may exist outside the diff hunk.

- If the prompt essentially asks you to refactor or improve existing code, check
  if you can phrase it as a code guideline. If it's possible, add it to
  the relevant Code guidelines section in `AGENTS.md`.

- After completing the task you MUST verify that the code you've written
  follows the Code guidelines in this file.

- When adding a new scriptlet or redirect resource, you MUST update
  `scripts/compatibility-table.json` accordingly (except for trusted
  scriptlets).

- Use `pnpm` as the package manager. Do not use `npm` or `yarn`.

### Spec-Driven Development (SDD)

Non-trivial changes MUST be preceded by a spec created with the SDD slash
commands, which should be available globally (preferred).

Specs are local-only and never committed — `specs/.current/` contents are
gitignored.

## Code guidelines

### I. Architecture

The library is organized into four public entry points, each exposed via
`package.json` `exports`:

1. **`@adguard/scriptlets`** (`src/index.ts`) — main API: `invoke()`,
   `getScriptletFunction()`, `SCRIPTLETS_VERSION`.
2. **`@adguard/scriptlets/redirects`** (`src/redirects/`) — `Redirects` class,
   `getRedirectFilename()`, `isBlocking()`.
3. **`@adguard/scriptlets/converters`** (`src/converters/`) — rule syntax
   converters (ADG ↔ UBO ↔ ABP).
4. **`@adguard/scriptlets/validators`** (`src/validators/`) — rule validation
   functions.

Each scriptlet is a single file in `src/scriptlets/` with a JSDoc header
containing `@scriptlet` or `@trustedScriptlet` and `@description` tags.
These tags drive auto-generated wiki documentation.

Shared logic lives in `src/helpers/`. Helpers are bundled into each scriptlet
at build time — they MUST NOT have side effects or rely on module-level state.

**Rationale**: Scriptlets are inlined into web pages individually; they cannot
share runtime modules so all dependencies must be statically bundleable.

#### Helper injection mechanism

Each scriptlet (and redirect) declares an `injections` array — a flat list of
helper functions that are stringified and concatenated to the scriptlet code at
build time (see `attachDependencies()` in `src/helpers/injector.ts`).

**Injection resolution is NOT transitive.** Although helpers may `import` other
helpers at the TypeScript/module level (e.g. `getDescriptorAddon` imports
`randomId`), those transitive imports are NOT automatically included in the
built scriptlet output. The build system stringifies each function listed in
`injections` individually via `.toString()` — it does not follow or resolve
`import` statements inside those functions.

Therefore, if a scriptlet uses helper **A** and helper **A** internally calls
helper **B**, the scriptlet MUST list **both A and B** in its `injections`
array. Omitting **B** will cause a `ReferenceError` at runtime because the
helper's code will reference a function that was never concatenated into the
output.

Example from `abort-current-inline-script.js` — both `getDescriptorAddon` and
its dependency `randomId` are listed explicitly:

```js
abortCurrentInlineScript.injections = [
    randomId,            // required by getDescriptorAddon and createOnErrorHandler
    setPropertyAccess,
    getPropertyInChain,
    toRegExp,
    createOnErrorHandler, // uses randomId internally
    hit,
    logMessage,
    isEmptyObject,
    getDescriptorAddon,   // uses randomId internally
];
```

When adding or modifying helpers in a scriptlet's `injections` list, always
verify that every helper-of-helper dependency is also present in the array.

### II. Code quality standards

General code style guidelines are available via link:
<https://github.com/AdguardTeam/CodeGuidelines/blob/master/JavaScript/Javascript.md>.

Project-specific rules:

1. You MUST NOT use array destructuring in `src/` files. Use indexed access
   instead (e.g., `const first = arr[0];` not `const [first] = arr;`).

   **Rationale**: Babel's `_slicedToArray` helper is unavailable in the bundled
   scriptlet runtime, causing `ReferenceError`.

2. TypeScript is preferred for new files. Existing `.js` files MAY remain as-is.

3. All scriptlet and redirect source files MUST include JSDoc with `@scriptlet`
   (or `@trustedScriptlet` / `@redirect`) and `@description` tags.

   **Rationale**: The `wiki:build-docs` script generates documentation from
   these tags.

4. Imports MUST use `type` qualifier for type-only imports
   (`import { type Foo }`).

   **Rationale**: Enforced by `@typescript-eslint/consistent-type-imports`.

5. Max line length is 120 characters (code and markdown).

6. Indentation is 4 spaces (no tabs).

7. External and internal imports MUST be separated by an empty line.

8. TypeScript tuple type annotations with 3 or more elements MUST be formatted
   as multiline, with each element on its own line.

    **Good**:

    ```typescript
    args: [
        method: string,
        url: string,
        async?: boolean,
        user?: string,
        password?: string,
    ],
   ```

    **Bad**:

    ```typescript
    args: [ method: string, url: string, async?: boolean, user?: string, password?: string],
    ```

    **Rationale**: Improves readability and makes diffs cleaner when parameters
    are added or modified.

### III. Testing discipline

- **QUnit tests** (`tests/scriptlets/`, `tests/redirects/`,
  `tests/helpers/`): test files are named `<name>.test.js`. QUnit tests run in
  a real browser environment via Puppeteer. Use these for scriptlet and redirect
  behavior testing.

- **Vitest tests** (`tests/api/`, root `*.spec.js`/`*.spec.ts`): test files
  are named `*.spec.js` or `*.spec.ts`. Use these for API-level, converter,
  and validator testing. Environment is jsdom.

- Every new scriptlet or redirect MUST have a corresponding `.test.js` file
  in the appropriate `tests/` subdirectory.

- Test file naming convention: `.test.js` for QUnit, `.spec.js`/`.spec.ts`
  for Vitest. This separation ensures QUnit tests are not picked up by Vitest
  and vice versa.

### IV. Other

- The `wiki/` directory contains auto-generated Markdown files. Do NOT edit
  them manually — they are regenerated by `pnpm wiki:build-docs`.

- `scripts/compatibility-table.json` is the source of truth for cross-blocker
  compatibility data. Update it when adding new scriptlets or redirects
  (except trusted scriptlets).
