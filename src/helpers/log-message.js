/**
 * Conditionally logs message to console.
 * Convention is to log messages by source.verbose if such log
 * is not a part of scriptlet's functionality, eg on invalid input,
 * and use 'forced' argument otherwise.
 *
 * @param {Object} source required, scriptlet properties
 * @param {string} message required, message to log
 * @param {boolean} [forced=false] to log message unconditionally
 */
export const logMessage = (source, message, forced = false) => {
    const {
        name,
        ruleText,
        verbose,
    } = source;

    if (!forced && !verbose) {
        return;
    }

    let messageStr = `${name}: ${message}`;

    // Extract scriptlet part from rule text
    if (ruleText) {
        const RULE_MARKER = '#%#//scriptlet';
        const markerIdx = ruleText.indexOf(RULE_MARKER);
        if (markerIdx > -1) {
            const ruleWithoutDomains = ruleText.slice(markerIdx, ruleText.length);
            messageStr += `; cannot apply rule: ${ruleWithoutDomains}`;
        }
    }

    // eslint-disable-next-line no-console
    console.log(messageStr);
};
