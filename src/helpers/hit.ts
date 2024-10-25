/* eslint-disable no-console, no-underscore-dangle */

import { ArbitraryFunction, Source } from '../../types/types';

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
    const ADGUARD_PREFIX = '[AdGuard]';
    if (!source.verbose) {
        return;
    }

    try {
        const trace = console.trace.bind(console);

        let label = `${ADGUARD_PREFIX} `;
        if (source.engine === 'corelibs') {
            // rule text will be available for corelibs
            label += source.ruleText;
        } else {
            if (source.domainName) {
                label += `${source.domainName}`;
            }
            if (source.args) {
                label += `#%#//scriptlet('${source.name}', '${source.args.join("', '")}')`;
            } else {
                label += `#%#//scriptlet('${source.name}')`;
            }
        }

        if (trace) {
            trace(label);
        }
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
