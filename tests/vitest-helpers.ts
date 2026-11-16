import { JSDOM } from 'jsdom';
import { vi } from 'vitest';

/**
 * Vitest's jsdom window global is not jsdom's Window instance, so event constructors reject `view: window`.
 * clickElement() passes it for browsers; tests do not depend on it, so it is dropped.
 * Restore the constructors with `vi.unstubAllGlobals()`.
 */
export const useViewlessMouseEvents = () => {
    const withoutView = <T extends typeof MouseEvent>(EventClass: T): T => {
        return new Proxy(EventClass, {
            construct(Target, args) {
                return new Target(args[0], { ...args[1], view: null });
            },
        });
    };
    vi.stubGlobal('MouseEvent', withoutView(MouseEvent));
    if (typeof PointerEvent === 'function') {
        vi.stubGlobal('PointerEvent', withoutView(PointerEvent));
    }
};

/**
 * Node.js defines its own `localStorage`, which is `undefined` without the `--localstorage-file` option, e.g. in
 * Node.js 25 and newer, and it hides the storages of the jsdom window of Vitest, so `localStorage` and
 * `sessionStorage` are replaced by the ones of a separate jsdom page, which implement `Storage` as browsers do.
 * Restore them with `vi.unstubAllGlobals()`.
 *
 * @returns Window of the jsdom page, e.g. for its `Storage`.
 */
export const useJsdomStorages = (): JSDOM['window'] => {
    const { window } = new JSDOM('', { url: 'https://example.org/' });
    vi.stubGlobal('localStorage', window.localStorage);
    vi.stubGlobal('sessionStorage', window.sessionStorage);
    return window;
};
