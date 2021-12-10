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
    const closeImmediately = () => {
        try {
            hit(source);
            window.close();
        } catch (e) {
            // log the error if window closing is impossible
            // https://developer.mozilla.org/en-US/docs/Web/API/Window/close
            console.log(e); // eslint-disable-line no-console
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
];

forceWindowClose.injections = [hit, toRegExp];
