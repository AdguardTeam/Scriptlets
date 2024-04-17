/* eslint-disable no-console, no-underscore-dangle */

declare global {
    interface Window {
        __debug?: ArbitraryFunction;
    }
}

/**
 * Hit used only for debug purposes now
 *
 * @param source scriptlet properties
 * use LOG_MARKER = 'log: ' at the start of a message
 * for logging scriptlets
 */
export const hit = (source: Source) => {
    if (source.verbose !== true) {
        return;
    }

    try {
        const log = console.log.bind(console);
        const trace = console.trace.bind(console);

        let prefix = '';
        if (source.domainName) {
            prefix += `${source.domainName}`;
        }
        prefix += `#%#//scriptlet('${source.name}', '${source.args.join(', ')}')`;

        log(`${prefix} trace start`);
        if (trace) {
            trace();
        }
        log(`${prefix} trace end`);
    } catch (e) {
        // try catch for Edge 15
        // In according to this issue https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/14495220/
        // console.log throws an error
    }

    // This is necessary for unit-tests only!
    if (typeof window.__debug === 'function') {
        window.__debug(source);
    }
};
