import { hit, toRegExp } from '../helpers/index';

/**
 * @scriptlet close-window
 *
 * @description
 * Closes the browser tab immediately.
 *
 * > `window.close()` usage is restricted in Chrome. In this case
 * tab will only be closed if using AdGuard browser extension.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('close-window'[, path])
 * ```
 *
 * - `path` — optional, string or regular expression
 * matching the current location's path: `window.location.pathname` + `window.location.search`.
 * Defaults to execute on every page.
 *
 * **Examples**
 * ```
 * ! closes any example.org tab
 * example.org#%#//scriptlet('close-window')
 *
 * ! closes specific example.org tab
 * example.org#%#//scriptlet('close-window', '/example-page.html')
 * ```
 */
export function forceWindowClose(source, path = '') {
    // eslint-disable-next-line no-console
    const log = console.log.bind(console);

    // https://github.com/AdguardTeam/Scriptlets/issues/158#issuecomment-993423036
    if (typeof window.close !== 'function') {
        if (source.verbose) {
            log('window.close() is not a function so \'close-window\' scriptlet is unavailable');
        }
        return;
    }

    const closeImmediately = () => {
        try {
            hit(source);
            window.close();
        } catch (e) {
            // log the error if window closing is impossible
            // https://developer.mozilla.org/en-US/docs/Web/API/Window/close
            log(e);
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

        if (navigator.userAgent.indexOf('Chrome') > -1) {
            closeByExtension();
        }
    }
}

forceWindowClose.names = [
    'close-window',
    'window-close-if.js',
    'ubo-window-close-if.js',
    'ubo-window-close-if',
];

forceWindowClose.injections = [hit, toRegExp];
