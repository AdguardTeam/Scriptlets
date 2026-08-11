/**
 * Resolution stub for `node-qunit-puppeteer`.
 *
 * The package lives in the `tests` workspace package, which CI's filtered
 * non-browser stages do not install. `qunit-runner.spec.ts` replaces the
 * module with a `vi.mock` factory, so the real code is never executed —
 * Vitest only needs the module id to resolve to an existing file.
 *
 * NOTE: this must be a separate file from `puppeteer.stub.ts` — Vitest keys
 * its mock registry by resolved path, so aliasing both module ids to one file
 * would make their `vi.mock` factories collide.
 */
export default {};
