/* eslint-disable func-names */
import { hit, setPropertyAccess } from '../helpers';

/**
 * Prevents anti-adblock scripts on adfly short links.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#adfly-defuserjs-
 *
 * @param {Source} source
 */
export function preventAdfly(source) {
    const isDigit = (data) => /^\d$/.test(data);
    const handler = function (encodedURL) {
        let evenChars = '';
        let oddChars = '';
        for (let i = 0; i < encodedURL.length; i += 1) {
            if (i % 2 === 0) {
                evenChars += encodedURL.charAt(i);
            } else {
                oddChars = encodedURL.charAt(i) + oddChars;
            }
        }

        let data = (evenChars + oddChars).split('');

        for (let i = 0; i < data.length; i += 1) {
            if (isDigit(data[i])) {
                for (let ii = i + 1; ii < data.length; ii += 1) {
                    if (isDigit(data[ii])) {
                        // eslint-disable-next-line no-bitwise
                        const temp = parseInt(data[i], 10) ^ parseInt(data[ii], 10);
                        if (temp < 10) {
                            data[i] = temp.toString();
                        }
                        i = ii;
                        break;
                    }
                }
            }
        }
        data = data.join('');
        const decodedURL = window.atob(data).slice(16, -16);
        /* eslint-disable compat/compat */
        if (window.stop) {
            window.stop();
        }
        /* eslint-enable compat/compat */
        window.onbeforeunload = null;
        window.location.href = decodedURL;
    };

    let val;
    // Do not apply handler more than one time
    let applyHandler = true;

    const result = setPropertyAccess(window, 'ysmm', {
        configurable: false,
        set: (value) => {
            if (applyHandler) {
                applyHandler = false;
                try {
                    if (typeof value === 'string') {
                        handler(value);
                    }
                } catch (err) { } // eslint-disable-line no-empty
            }
            val = value;
        },
        get: () => val,
    });

    if (result) {
        hit(source);
    } else {
        window.console.error('Failed to set up prevent-adfly scriptlet');
    }
}

preventAdfly.names = [
    'prevent-adfly',
    'adfly-defuser.js',
    'ubo-adfly-defuser.js',
];

preventAdfly.injections = [setPropertyAccess, hit];
