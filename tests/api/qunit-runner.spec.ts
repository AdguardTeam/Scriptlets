import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { runQunit } from '../index';

/**
 * Pins the QUnit runner's per-test page lifecycle.
 *
 * node-qunit-puppeteer's `runQunitWithBrowser` opens a page per test but never
 * closes it; reusing one browser for the whole suite leaks pages (each loads
 * the scriptlets bundle) and grows Chrome's RSS until the CI builder is
 * OOM-killed under its 1800m cap. The runner must open AND close a page for
 * every test file.
 *
 * `vi.mock` factories are hoisted above the imports by vitest's transform, so
 * the mocks are registered before `../index` is evaluated even though the
 * `import` statement appears first textually.
 */

vi.mock('node-qunit-puppeteer', () => {
    const passing = {
        totalTests: 1,
        stats: {
            failed: 0,
            total: 1,
            passed: 1,
            runtime: 1,
        },
        modules: {},
    };
    return {
        runQunitWithBrowser: vi.fn(async () => passing),
        runQunitWithPage: vi.fn(async () => passing),
        printResultSummary: vi.fn(),
        printFailedTests: vi.fn(),
    };
});

vi.mock('../server', () => ({
    server: { init: () => ({}) },
    port: 1,
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
}));

vi.mock('puppeteer', () => ({
    default: { launch: vi.fn() },
}));

describe('runQunit page lifecycle', () => {
    it('opens and closes a page for each test file', async () => {
        const close = vi.fn(async () => {});
        const newPage = vi.fn(async () => ({ close }));
        const browser = { newPage };

        const passed = await runQunit('some-test.html', browser);

        expect(newPage).toHaveBeenCalledTimes(1);
        expect(close).toHaveBeenCalledTimes(1);
        expect(passed).toBe(true);
    });
});
