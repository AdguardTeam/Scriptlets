import { hit, toRegExp } from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet remove-cookie
 *
 * @description
 * Removes current page cookies by passed string matching with name. For current domain and subdomains.
 * Runs on load and before unload.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#cookie-removerjs-
 *
 * Related ABP source:
 * https://gitlab.com/eyeo/snippets/-/blob/main/source/behavioral/cookie-remover.js
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('remove-cookie'[, match])
 * ```
 *
 * - `match` — optional, string or regex matching the cookie name.
 *   If not specified all accessible cookies will be removed.
 *
 * ### Examples
 *
 * 1. Removes all cookies
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-cookie')
 *     ```
 *
 * 1. Removes cookies which name contains `example` string
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-cookie', 'example')
 *     ```
 *
 *     For instance this cookie will be removed:
 *
 *     ```javascript
 *     document.cookie = '__example=randomValue';
 *     ```
 *
 * @added v1.0.4.
 */
/* eslint-enable max-len */
export function removeCookie(source, match) {
    const matchRegexp = toRegExp(match);

    const removeCookieFromHost = (cookieName, hostName) => {
        const cookieSpec = `${cookieName}=`;
        const domain1 = `; domain=${hostName}`;
        const domain2 = `; domain=.${hostName}`;
        const path = '; path=/';
        const expiration = '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = cookieSpec + expiration;
        document.cookie = cookieSpec + domain1 + expiration;
        document.cookie = cookieSpec + domain2 + expiration;
        document.cookie = cookieSpec + path + expiration;
        document.cookie = cookieSpec + domain1 + path + expiration;
        document.cookie = cookieSpec + domain2 + path + expiration;
        hit(source);
    };

    const rmCookie = () => {
        document.cookie.split(';').forEach((cookieStr) => {
            const pos = cookieStr.indexOf('=');
            if (pos === -1) {
                return;
            }

            const cookieName = cookieStr.slice(0, pos).trim();
            if (!matchRegexp.test(cookieName)) {
                return;
            }

            const hostParts = document.location.hostname.split('.');
            for (let i = 0; i <= hostParts.length - 1; i += 1) {
                const hostName = hostParts.slice(i).join('.');
                if (hostName) {
                    removeCookieFromHost(cookieName, hostName);
                }
            }
        });
    };
    rmCookie();
    window.addEventListener('beforeunload', rmCookie);
}

removeCookie.names = [
    'remove-cookie',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'cookie-remover.js',
    'ubo-cookie-remover.js',
    'ubo-cookie-remover',
    'remove-cookie.js',
    'ubo-remove-cookie.js',
    'ubo-remove-cookie',
    'abp-cookie-remover',
];

removeCookie.injections = [toRegExp, hit];
