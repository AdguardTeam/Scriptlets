import { toRegExp } from '../helpers/string-utils';
import { hit } from '../helpers';

/**
 * Removes current page cookies specified by name.
 * For current domain, subdomains on load and before unload.
 * @param {Source} source
 * @param {string} match string for matching with cookie name
 */
export function removeCookie(source, match) {
    const regex = match ? toRegExp(match) : toRegExp('/.?/');

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
            if (!regex.test(cookieName)) {
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
    'ubo-cookie-remover.js',
];

removeCookie.injections = [toRegExp, hit];
