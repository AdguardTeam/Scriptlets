import { hit, toRegExp } from '../helpers';

/**
 * @scriptlet close-window
 *
 * @description
 * Closes the browser tab immediately.
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

    if (path === '') {
        closeImmediately();
    } else {
        const pathRegexp = toRegExp(path);
        const currentPath = `${window.location.pathname}${window.location.search}`;

        if (pathRegexp.test(currentPath)) {
            closeImmediately();
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
