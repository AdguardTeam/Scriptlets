/**
 * Calls the callback when the document reaches the ready state of the `runAt` option of scriptlets,
 * in AdGuard and in uBO syntax, exactly as uBO `runAt()` does: `loading` or `asap` (1),
 * `interactive` or `end` (2), `complete` or `idle` (3), also as numbers, e.g. `runAt, 2`,
 * or now if the option is not set, unknown, or the state has been reached.
 *
 * @param callback Function to call.
 * @param when Value of the `runAt` option, e.g. `2` or `interactive`.
 */
export const runAtReadyState = (callback: () => void, when: unknown): void => {
    // !IMPORTANT: Do not move constants outside of this function
    const READY_STATES: Record<string, number> = {
        loading: 1,
        asap: 1,
        interactive: 2,
        end: 2,
        2: 2,
        complete: 3,
        idle: 3,
        3: 3,
    };

    const getReadyStateNumber = (state: unknown): number => {
        const key = `${state}`;
        return Object.prototype.hasOwnProperty.call(READY_STATES, key) ? READY_STATES[key] : 0;
    };

    const target = getReadyStateNumber(when);
    if (getReadyStateNumber(document.readyState) >= target) {
        callback();
        return;
    }

    const onReadyStateChange = (): void => {
        if (getReadyStateNumber(document.readyState) < target) {
            return;
        }
        document.removeEventListener('readystatechange', onReadyStateChange, true);
        callback();
    };
    document.addEventListener('readystatechange', onReadyStateChange, true);
};
