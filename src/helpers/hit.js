/* eslint-disable no-console, no-underscore-dangle */

/**
 * Hit used only for debug purposes now
 *
 * @param {Object} source scriptlet properties
 * use LOG_MARKER = 'log: ' at the start of a message
 * for logging scriptlets
 */
export const hit = (source) => {
    if (source.verbose !== true) {
        return;
    }

    try {
        const log = console.log.bind(console);
        const trace = console.trace.bind(console); // eslint-disable-line compat/compat

        let prefix = source.ruleText || '';

        if (source.domainName) {
            const AG_SCRIPTLET_MARKER = '#%#//';
            const UBO_SCRIPTLET_MARKER = '##+js';
            let ruleStartIndex;
            if (source.ruleText.indexOf(AG_SCRIPTLET_MARKER) > -1) {
                ruleStartIndex = source.ruleText.indexOf(AG_SCRIPTLET_MARKER);
            } else if (source.ruleText.indexOf(UBO_SCRIPTLET_MARKER) > -1) {
                ruleStartIndex = source.ruleText.indexOf(UBO_SCRIPTLET_MARKER);
            }
            // delete all domains from ruleText and leave just rule part
            const rulePart = source.ruleText.slice(ruleStartIndex);
            // prepare applied scriptlet rule for specific domain
            prefix = `${source.domainName}${rulePart}`;
        }

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
