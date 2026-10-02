import { vi } from 'vitest';

/**
 * Vitest's jsdom window global is not jsdom's Window instance, so event constructors reject `view: window`.
 * clickElement() passes it for browsers; tests do not depend on it, so it is dropped.
 * Restore the constructors with `vi.unstubAllGlobals()`.
 */
export const useViewlessMouseEvents = () => {
    const withoutView = <T extends typeof MouseEvent>(EventClass: T): T => new Proxy(EventClass, {
        construct(Target, args) {
            return new Target(args[0], { ...args[1], view: null });
        },
    });
    vi.stubGlobal('MouseEvent', withoutView(MouseEvent));
    if (typeof PointerEvent === 'function') {
        vi.stubGlobal('PointerEvent', withoutView(PointerEvent));
    }
};
