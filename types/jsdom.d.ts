/**
 * Minimal declaration of jsdom, which has no types in the project, for the Vitest helpers which create
 * a separate jsdom page, e.g. `useJsdomStorages()` in `tests/vitest-helpers.ts`.
 */
declare module 'jsdom' {
    export class JSDOM {
        constructor(html?: string, options?: Record<string, unknown>);

        readonly window: Window & typeof globalThis;
    }
}
