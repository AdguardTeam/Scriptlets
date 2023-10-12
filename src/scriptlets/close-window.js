import {
    hit,
    toRegExp,
    logMessage,
} from '../helpers/index';

/**
 * @scriptlet close-window
 *
 * @description
 * Closes the browser tab immediately.
 *
 * > `window.close()` usage is restricted in the Chrome browser.
 * > In this case tab will only be closed when using AdGuard Browser extension.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('close-window'[, path])
 * ```
 *
 * - `path` — optional, string or regular expression
 *   matching the current location's path: `window.location.pathname` + `window.location.search`.
 *   Defaults to execute on every page.
 *
 * ### Examples
 *
 * ```adblock
 * ! closes any example.org tab
 * example.org#%#//scriptlet('close-window')
 *
 * ! closes specific example.org tab
 * example.org#%#//scriptlet('close-window', '/example-page.html')
 * ```
 *
 * @added v1.5.0.
 */
export function forceWindowClose(source, path = '') {
    // https://github.com/AdguardTeam/Scriptlets/issues/158#issuecomment-993423036
    if (typeof window.close !== 'function') {
        const message = 'window.close() is not a function so \'close-window\' scriptlet is unavailable';
        logMessage(source, message);
        return;
    }

    const closeImmediately = () => {
        try {
            hit(source);
            window.close();
        } catch (e) {
            // log the error if window closing is impossible
            // https://developer.mozilla.org/en-US/docs/Web/API/Window/close
            logMessage(source, e);
        }
    };

    const closeByExtension = () => {
        const extCall = () => {
            dispatchEvent(new Event('adguard:scriptlet-close-window'));
        };
        window.addEventListener('adguard:subscribed-to-close-window', extCall, { once: true });
        setTimeout(() => {
            window.removeEventListener('adguard:subscribed-to-close-window', extCall, { once: true });
        }, 5000);
    };

    const shouldClose = () => {
        if (path === '') {
            return true;
        }

        const pathRegexp = toRegExp(path);
        const currentPath = `${window.location.pathname}${window.location.search}`;
        return pathRegexp.test(currentPath);
    };

    if (shouldClose()) {
        closeImmediately();

        if (navigator.userAgent.includes('Chrome')) {
            closeByExtension();
        }
    }
}

forceWindowClose.names = [
    'close-window',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'window-close-if.js',
    'ubo-window-close-if.js',
    'ubo-window-close-if',
    'close-window.js',
    'ubo-close-window.js',
    'ubo-close-window',
];

forceWindowClose.injections = [
    hit,
    toRegExp,
    logMessage,
];
