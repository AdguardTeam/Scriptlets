/* eslint-disable func-names */
import { setPropertyAccess, stringToFunc } from '../helpers';

/**
 * Prevents anti adblock based on adfly shortened links
 * @param {Source} source
 */
export function preventAdfly(source) {
    const hit = stringToFunc(source.hit);
    const isDigit = /^\d$/;
    const handler = function (encodedURL) {
        let var1 = '';
        let var2 = '';
        for (let i = 0; i < encodedURL.length; i += 1) {
            if (i % 2 === 0) {
                var1 += encodedURL.charAt(i);
            } else {
                var2 = encodedURL.charAt(i) + var2;
            }
        }

        let data = (var1 + var2).split('');

        for (let i = 0; i < data.length; i += 1) {
            if (isDigit.test(data[i])) {
                for (let ii = i + 1; ii < data.length; ii += 1) {
                    if (isDigit.test(data[ii])) {
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
        window.stop();
        window.onbeforeunload = null;
        window.location.href = decodedURL;
    };

    let val;
    let flag = true;

    const result = setPropertyAccess(window, 'ysmm', {
        configurable: false,
        set: (value) => {
            if (flag) {
                flag = false;
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
        hit();
    } else {
        window.console.error('Failed to set up prevent-adfly scriptlet');
    }
}

preventAdfly.names = [
    'prevent-adfly',
    'adfly-defuser.js',
];

preventAdfly.injections = [stringToFunc, setPropertyAccess];
