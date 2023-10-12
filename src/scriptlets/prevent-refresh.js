import {
    hit,
    getNumberFromString,
    logMessage,
    // following helpers are needed for helpers above
    nativeIsNaN,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-refresh
 *
 * @description
 * Prevents reloading of a document through a meta "refresh" tag.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#refresh-defuserjs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('prevent-refresh'[, delay])
 * ```
 *
 * - `delay` — optional, number of seconds for delay that indicates when scriptlet should run.
 *   If not set, source tag value will be applied.
 *
 * ### Examples
 *
 * 1. Prevent reloading of a document through a meta "refresh" tag
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-refresh')
 *     ```
 *
 * 1. Prevent reloading of a document with delay
 *
 *     ```adblock
 *     example.com#%#//scriptlet('prevent-refresh', 3)
 *     ```
 *
 * @added v1.6.2.
 */
/* eslint-enable max-len */
export function preventRefresh(source, delaySec) {
    const getMetaElements = () => {
        let metaNodes = [];
        try {
            metaNodes = document.querySelectorAll('meta[http-equiv="refresh" i][content]');
        } catch (e) {
            // 'i' attribute flag is problematic in Edge 15
            try {
                metaNodes = document.querySelectorAll('meta[http-equiv="refresh"][content]');
            } catch (e) {
                logMessage(source, e);
            }
        }
        return Array.from(metaNodes);
    };
    const getMetaContentDelay = (metaElements) => {
        const delays = metaElements
            .map((meta) => {
                const contentString = meta.getAttribute('content');
                if (contentString.length === 0) {
                    return null;
                }
                let contentDelay;
                // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-http-equiv
                const limiterIndex = contentString.indexOf(';');
                if (limiterIndex !== -1) {
                    const delaySubstring = contentString.substring(0, limiterIndex);
                    contentDelay = getNumberFromString(delaySubstring);
                } else {
                    contentDelay = getNumberFromString(contentString);
                }
                return contentDelay;
            })
            .filter((delay) => delay !== null);
        // Check if "delays" array is empty, may happens when meta's content is invalid
        // and reduce() method cannot be used with empty arrays without initial value
        if (!delays.length) {
            return null;
        }
        // Get smallest delay of all metas on the page
        const minDelay = delays.reduce((a, b) => Math.min(a, b));
        // eslint-disable-next-line consistent-return
        return minDelay;
    };

    const stop = () => {
        const metaElements = getMetaElements();
        if (metaElements.length === 0) {
            return;
        }
        let secondsToRun = getNumberFromString(delaySec);
        // Check if argument is provided
        if (secondsToRun === null) {
            secondsToRun = getMetaContentDelay(metaElements);
        }
        // Check if meta tag has delay
        if (secondsToRun === null) {
            return;
        }
        const delayMs = secondsToRun * 1000;
        setTimeout(() => {
            window.stop();
            hit(source);
        }, delayMs);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', stop, { once: true });
    } else {
        stop();
    }
}

preventRefresh.names = [
    'prevent-refresh',
    // Aliases are needed for matching the related scriptlet converted into our syntax
    // These are used by UBO rules syntax
    // https://github.com/gorhill/uBlock/wiki/Resources-Library#general-purpose-scriptlets
    'prevent-refresh.js',
    'refresh-defuser.js',
    'refresh-defuser',
    // Prefix 'ubo-' is required to run converted rules
    'ubo-prevent-refresh.js',
    'ubo-prevent-refresh',
    'ubo-refresh-defuser.js',
    'ubo-refresh-defuser',
];

preventRefresh.injections = [
    hit,
    getNumberFromString,
    logMessage,
    nativeIsNaN,
];
