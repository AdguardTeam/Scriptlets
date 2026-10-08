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
  Puppeteer) and Vitest (API, validators, converters, helpers, scriptlets —
  jsdom)
- **Target platform**: Browser extension and Corelibs
- **Project type**: single
- **Performance goals**: N/A
- **Constraints**: Array destructuring is forbidden in `src/` — Babel's
  `_slicedToArray` helper is not available in the bundled runtime
- **Scale/scope**: Used by AdGuard products (CoreLibs, Browser Extension,
  Safari, iOS) and filter list maintainers

> All `dependencies` and `devDependencies` must be pinned to exact versions (no caret `^`, etc.).

## Project structure

```text
scriptlets/
├── .github/
│   └── workflows/            # GitHub Actions: ci, mirror, prepare/publish release
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
│   ├── helpers/              # QUnit and Vitest tests for helper utilities
│   ├── redirects/            # QUnit tests for redirect resources
│   ├── scriptlets/           # QUnit and Vitest tests for scriptlets
│   ├── smoke/                # Smoke tests for ESM exports
│   └── vitest-helpers.ts     # Vitest-only test utilities (e.g. jsdom workarounds)
├── types/                    # Ambient type declarations
├── wiki/                     # Auto-generated documentation (scriptlet/redirect docs, compatibility table)
├── .dockerignore             # Docker build context exclusions
├── .eslintrc.cjs             # ESLint configuration
├── .markdownlint.json        # Markdownlint configuration
├── rollup.config.js          # Rollup bundle configuration
├── tsconfig.json             # TypeScript configuration
├── vitest.config.ts          # Vitest configuration
├── DEPLOYMENT.md             # Release and npm publish runbook
├── DEVELOPMENT.md            # Development guide
└── package.json              # Package manifest and scripts
```

## Build and test commands

- `pnpm install` — install dependencies
- `pnpm build` — clean `dist/` and build all bundles
- `pnpm test` — run all tests (Vitest + smoke + QUnit)
- `pnpm test:vitest` — run Vitest tests only (API, validators, converters,
  helpers, scriptlets)
- `pnpm test:qunit scriptlets` — run QUnit tests for all scriptlets
- `pnpm test:qunit redirects` — run QUnit tests for all redirects
- `pnpm test:qunit helpers` — run QUnit tests for helpers
- `pnpm test:qunit scriptlets --name <name>` — rebuild and run a single
  scriptlet test
- `pnpm test:qunit scriptlets --name <name> --build` — only rebuild a single
  scriptlet test, without running it, e.g. while it is open with `--gui`
- `pnpm test:qunit:build` — build the QUnit test bundles without running them
  (CI split-stage equivalent of `test:qunit --build`; paired with `test:qunit:run`)
- `pnpm test:qunit:run` — run the QUnit tests without rebuilding (CI
  split-stage; expects `test:qunit:build` to have run first)
- `pnpm tgz` — pack `@adguard/scriptlets` into `scriptlets.tgz` (requires a
  version; CI stamps it via `set-dev-version`, local builds must stamp first)
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
  `pnpm test:qunit scriptlets --name <name>` (or `redirects`).
  For API/validator/converter and helper changes, and for scriptlets which have
  Vitest specs in `tests/scriptlets/`, use `pnpm test:vitest`, or e.g.
  `pnpm test:vitest tests/scriptlets/<name>.spec.js` for a single spec.

- When making changes to the project structure, ensure the Project structure
  section in `AGENTS.md` is updated and remains valid.

- When the task is finished update `CHANGELOG.md` file and explain changes in
  the `Unreleased` section. Add entries to the appropriate subsection (`Added`,
  `Changed`, or `Fixed`) if it already exists; do not create duplicate
  subsections. Changes limited to tests (e.g. `tests/`) or CI configuration
  (e.g. `.github/workflows/` or `Dockerfile`) MUST NOT add CHANGELOG entries —
  they are internal infrastructure and do not affect the published library.

- CI/CD runs on GitHub Actions (`.github/workflows/`): `ci.yml` uses the shared
  `set-dev-version` action before Docker builds, while `mirror.yml`,
  `prepare-release.yml`, and `publish-release.yml` delegate to shared reusable
  workflows. `package.json` MUST NOT contain a committed `version` field.
  Clean local builds derive the next patch `-dev` version from the latest
  released `CHANGELOG.md` heading. CI stamps that same development version,
  and release builds stamp the manually selected release version. The build
  MUST propagate the resolved value unchanged into `SCRIPTLETS_VERSION`,
  `dist/redirects.yml`, and `dist/scriptlets.corelibs.json`.

- All CI `docker build` invocations land on a single shared BuildKit instance,
  so Docker build steps MUST run strictly one after another
  (`lint` → `vitest` → `qunit` → `smoke-tests` → `build`). Concurrent builds
  can crash the builder (`error reading from server: EOF`) and fail the entire
  job at once. They are sequential steps within a single `ci` job (not
  separate jobs with `needs`), so GitHub Actions executes them in order by
  default. Cross-run serialization is provided by the self-hosted runner
  (`team-extensions`): if only one runner exists, GitHub assigns jobs one at a
  time so Docker builds never overlap. The `ci.yml` concurrency group is
  **per-ref** (`ci-ext-scriptlets-${{ github.head_ref || github.ref }}`) with
  `cancel-in-progress: true`, which cancels redundant same-ref pushes (only
  the latest run per ref survives) while allowing different PRs to run
  independently. The Dockerfile also caps the Node heap
  (`NODE_OPTIONS=--max-old-space-size=1536`, most of the 1800m buildx memory
  cap, with headroom for non-heap RSS) and skips the Chromium download in the
  smoke-test stage to keep per-build memory low.

- Docker builds MUST NOT pass cache-busting `--build-arg` values (e.g.
  `BUILD_RUN_ID`) whose only effect is to invalidate cached layers.  The
  previous `BUILD_RUN_ID` ARG wrote `/tmp/.build-run-id` (a file no script
  ever read) inside every build stage, busting the cache on every CI run and
  ballooning the shared BuildKit cache to >12 GB.  Sibling repos
  (`ext-disable-amp`, `ext-userscripts-wrapper`) do without it.  If you need to
  embed build metadata into artifacts, do it via build-args consumed by a
  dedicated final stage, or stamp it into `package.json`/dist files directly.

- CI workflows MUST NOT hardcode the remote BuildKit host address (e.g.
  `buildkit-extensions-0.buildkit-extensions-hl.github-runners.svc.cluster.local`).
  That cluster hostname can change over time, and embedding it couples CI to a
  specific Kubernetes deployment. Hacking `docker buildx prune` into a per-run
  workflow step is not recommended.

- Do NOT add an aggregate "all checks passed" job to `ci.yml`: the org-wide
  `AdGuardSoftwareLimited/actions/.github/workflows/check-master.yml`
  ("Branch up-to-date check", required by branch protection) already waits
  for every check run on the PR head SHA and blocks the merge until all
  succeed.

- If the prompt essentially asks you to refactor or improve existing code, check
  if you can phrase it as a code guideline. If it's possible, add it to
  the relevant Code guidelines section in `AGENTS.md`.

- After completing the task you MUST verify that the code you've written
  follows the Code guidelines in this file.

- When adding a new scriptlet or redirect resource, you MUST update
  `scripts/compatibility-table.json` accordingly (except for trusted
  scriptlets).

- Use `pnpm` as the package manager. Do not use `npm` or `yarn`.

- Commit messages MUST start with the ticket number (`AG-XXX`) so they
  auto-link with the task tracker, followed by a short description in the
  present tense (e.g. `AG-1234 Fix login redirect`). Automated commits made by
  CI (e.g. the wiki regeneration during the release flow) use a
  [Conventional Commits] prefix such as `docs:` instead.

[Conventional Commits]: https://www.conventionalcommits.org/en/v1.0.0/

### Spec-Driven Development (SDD)

Non-trivial changes MUST be preceded by a spec created with the SDD slash
commands, which should be available globally (preferred).

Specs are local-only and never committed — `.sdd/` contents are
gitignored (see `.gitignore`).

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

9. `package.json` MUST remain versionless in source control. Build code MUST use
   `getBuildVersion()`; workflows that package npm artifacts MUST stamp a
   version before packaging.

   **Rationale**: The Prepare release tag and `CHANGELOG.md` are the version
   sources of truth.

10. Scriptlets which re-apply themselves on DOM changes (e.g. via
    `observeDOMChanges`) MUST NOT write a value the target already has
    (compare before `setAttribute()` etc.) and MUST call `hit()` only if
    something has actually changed. Invalid arguments (e.g. selector) SHOULD
    be validated and logged once, before the observer is started; use the
    `isValidSelector()`, `isValidXpath()` and `isValidAttributeName()` helpers,
    and `getShadowSelectorError()` for selectors of `queryShadowSelector()`,
    i.e. with `>>>` combinator or `xpath(...)`, as they do not query or change
    the page DOM. Such arguments SHOULD be parsed once as well, and passed
    to helpers in the parsed form, e.g. selector parts split by `>>>` with
    `splitSelectors()` to `queryShadowSelector()`, instead of being parsed again
    on each DOM change. A failure to process an element SHOULD be logged once and not
    again until the processed value of the element changes.
    Such a failure SHOULD be detected from the processed value and remembered
    per element, not inferred from whether the write has changed the target.

    **Rationale**: `observeDOMChanges` only ignores the scriptlet's own
    mutations. A write of the same value still produces a mutation record
    which wakes up observers of other rules, so two such rules re-trigger
    each other infinitely, and a `hit()`, an argument error or an element
    failure logged on each callback floods the console on every unrelated
    DOM change. The target may already hold the result of the failed
    processing, e.g. in a copy of a processed element, so a failure logged
    only on change may be never logged for it.

11. To check whether an element is still matched by the scriptlet selector,
    e.g. after the scriptlet has changed it, use `element.matches()` with
    `:scope` replaced by `:root` (outside quoted strings), instead of querying
    the whole document again.

    **Rationale**: `:scope` refers to the root element in
    `document.querySelectorAll()`, but to the element itself in
    `element.matches()`, so e.g. `:scope a` never matches the link itself.

12. Use the URL parser for values explicitly selected from URL attributes,
    parameters or encoded destinations. Limit prose checks to visible link text.
    When coordinating DOM writes between rules, track actual writes instead of
    inferring their origin from similarities between values, and accept another
    rule's write only if it continues the write the rule has seen, i.e. compare
    write records by identity, not by the written value.
    Keep shared per-element records on the affected elements rather than in a
    `window` registry; use non-enumerable symbol properties, not HTML attributes.

    **Rationale**: Valid URLs can contain spaces, parentheses and other URLs.
    Page edits can resemble a rule's output, so guessing can reject valid values
    or prevent a rule from correcting a page edit. The written value alone cannot
    tell whether another rule continued this rule's write or changed a page edit.
    Element metadata avoids global storage and does not trigger DOM mutation
    observers.

13. Scriptlets which process matched elements on DOM changes MUST catch errors
    per element, log such an error once per element, and continue with other
    elements.

    **Rationale**: An error for one element, e.g. caused by the page, would
    otherwise stop processing of the other elements on each DOM change and be
    reported as uncaught on the page each time. `observeDOMChanges` only
    connects the observer again after its callback throws, so that the
    scriptlet does not stop working on the page.

14. Non-trivial parsing logic of a scriptlet which depends only on its arguments
    and has many edge cases, e.g. parsing of a URL parameter, SHOULD be a helper
    in `src/helpers/` covered by a Vitest spec in `tests/helpers/`, rather than
    a function inside the scriptlet. Constants of such a helper, e.g. regular
    expressions, MUST be defined inside the function, see
    [Helper injection mechanism](#helper-injection-mechanism).

    **Rationale**: Edge cases can be tested directly and quickly, without
    a browser page, and the helper can be reused by other scriptlets. Helpers are
    stringified one by one, so module-level constants are not in the built code.

15. Event listener hooks which spoof or proxy events, e.g. the `isTrusted`
    spoofing of `trusted-click-element`, MUST deliver every other event
    unchanged: only the events which the scriptlet dispatches itself, and the
    ones which the browser dispatches directly in response, e.g. the click
    which a label forwards to its control, are spoofed, unless the rule
    explicitly opts in to spoofing all events of the page, e.g. `isTrusted:all`.
    Trusted events MUST be delivered unchanged. All listeners of a spoofed
    event, including inline `on...` handlers, MUST receive the same proxy, so
    they MUST resolve the delivered event with one shared function, e.g.
    `getDeliveredEvent()` of `createSpoofedClicks()`. Listener wrappers shared
    across targets MUST remain stable when a listener is removed from one
    target; native registration handles deduplication, `once`, and
    `AbortSignal` cleanup, so wrapper lookups MUST convert `capture` the same
    way as `addEventListener` does, and a hook which reads the options MUST
    read them once and pass the values read to the native method. Hooks which
    withhold events on purpose, e.g. of `prevent-addEventListener` or
    `prevent-element-src-loading`, are not covered by this rule. How
    `trusted-click-element` recognizes the clicks which labels forward, e.g.
    through slots and closed shadow roots, is described in the JSDoc of
    `clickElement()` in `src/helpers/click-utils.ts` and of the functions
    inside it.

    **Rationale**: Popup guards compare event references, including
    `window.event`, so replacing page or browser events breaks them, see
    [#582](https://github.com/AdguardTeam/Scriptlets/issues/582), and so
    spoofing all events of the page is only an opt-in fallback. Removing
    a shared wrapper mapping breaks removal and deduplication on other
    targets. Options may be getters which return a different value on each
    read, so a wrapper looked up by one `capture` value and registered with
    another cannot be removed and is not deduplicated.

### III. Testing discipline

- **QUnit tests** (`tests/scriptlets/`, `tests/redirects/`,
  `tests/helpers/`): test files are named `<name>.test.js`. QUnit tests run in
  a real browser environment via Puppeteer. Use these for scriptlet and redirect
  behavior testing.

- **Vitest tests** (`tests/api/`, `tests/helpers/`, `tests/scriptlets/`,
  root `*.spec.js`/`*.spec.ts`): test files are named `*.spec.js` or
  `*.spec.ts`. Use these for API-level, converter, validator and helper
  testing, and for scriptlet behavior which needs no real browser, e.g. by
  calling the scriptlet function directly. Environment is jsdom.

- Tests of clicks which a label forwards to its control MUST make the label
  forward them as untrusted, e.g. with `forwardUntrustedLabelClicks()` in
  `tests/scriptlets/trusted-click-element.test.js`. Some browsers forward
  them as untrusted, e.g. Firefox, but others as trusted, e.g. the Chrome
  version which Puppeteer runs the tests in, where the spoofing of forwarded
  clicks would not be tested otherwise.

- Tests which install the click hook of `trusted-click-element` again, e.g.
  after deleting it between tests, MUST call `allowSpoofedClicksReset()` from
  `tests/helpers.js`, as the property which stores the shared spoofed clicks
  is not configurable outside of tests, so the page cannot replace it. It is
  tested without the wrapper in `tests/helpers/spoofed-clicks-property.spec.ts`.

- Every new scriptlet or redirect MUST have a corresponding `.test.js` file
  in the appropriate `tests/` subdirectory.

- Test file naming convention: `.test.js` for QUnit, `.spec.js`/`.spec.ts`
  for Vitest. This separation ensures QUnit tests are not picked up by Vitest
  and vice versa.

- `tests/` is a pnpm workspace package (`@adguard/scriptlets-tests`) that owns
  the QUnit/Puppeteer runtime dependencies (`qunit`, `sinon`, `js-reporters`,
  `node-qunit-puppeteer`, `puppeteer`); browser-asset copy paths in
  `scripts/build-tests.js` therefore point at `tests/node_modules/…`. CI's
  non-browser Docker stages install only the root package
  (`pnpm install --filter @adguard/scriptlets`).

- The QUnit test runner (`tests/index.js`) MUST launch Chrome with
  `--disable-dev-shm-usage` and MUST restart the browser periodically
  (`BROWSER_RESTART_INTERVAL`). Chrome's `/dev/shm` is tiny inside the CI
  Docker container (exhausting it makes page creation extremely slow), and a
  single long-lived browser accumulates V8 heap until the QUnit timeout fires
  before the test page finishes loading. If you change the runner, keep both
  mitigations in place.

- The test server (`tests/server.js`) MUST NOT assume its fixed port (54136)
  is free. `start()` falls back to an ephemeral port on `EADDRINUSE`, because
  the shared CI BuildKit builder can hold that port via a concurrent or
  leftover process — without the fallback the entire QUnit stage crashes with
  an unhandled `'error'` event. Callers MUST use the port `start()` resolves
  with (not the module-level `port` constant) when building test page URLs.

### IV. Other

- The `wiki/` directory contains auto-generated Markdown files. Do NOT edit
  them manually — they are regenerated by `pnpm wiki:build-docs`.

- `scripts/compatibility-table.json` is the source of truth for cross-blocker
  compatibility data. Update it when adding new scriptlets or redirects
  (except trusted scriptlets).
