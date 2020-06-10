import { hit } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet set-cookie
 *
 * @description
 * Sets cookie pair `name`=`value`. Cookie path defaults to root (`path=/;`).
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('set-cookie', name, value)
 * ```
 *
 * - `name` - required, cookie name to be set
 * - `value` - required, cookie value; possible values:
 *     - number `>= 0 && <= 15`
 *     - one of the predefined constants:
 *         - `true` / `True`
 *         - `false`
 *         - `yes` / `Yes` / `Y`
 *         - `no`
 *         - `ok` / `OK`
 *
 * **Examples**
 * ```
 * example.org#%#//scriptlet('set-cookie', 'checking', 'ok')
 *
 * example.org#%#//scriptlet('set-cookie', 'gdpr-settings-cookie', '1')
 * ```
 */
/* eslint-enable max-len */
export function setCookie(source, name, value) {
    if (!name && !value) {
        return;
    }

    const nativeIsNaN = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat
    let valueToSet;
    if (value === 'true') {
        valueToSet = 'true';
    } else if (value === 'True') {
        valueToSet = 'True';
    } else if (value === 'false') {
        valueToSet = 'false';
    } else if (value === 'yes') {
        valueToSet = 'yes';
    } else if (value === 'Yes') {
        valueToSet = 'Yes';
    } else if (value === 'Y') {
        valueToSet = 'Y';
    } else if (value === 'no') {
        valueToSet = 'no';
    } else if (value === 'ok') {
        valueToSet = 'ok';
    } else if (value === 'OK') {
        valueToSet = 'OK';
    } else if (/^\d+$/.test(value)) {
        valueToSet = parseFloat(value);
        if (nativeIsNaN(valueToSet)) {
            return;
        }
        if (Math.abs(valueToSet) < 0 || Math.abs(valueToSet) > 15) {
            return;
        }
    } else {
        return;
    }

    const pathToSet = 'path=/;';

    const cookieData = `${encodeURIComponent(name)}=${encodeURIComponent(valueToSet)}; ${pathToSet}`;

    hit(source);
    document.cookie = cookieData;
}

setCookie.names = [
    'set-cookie',
];

setCookie.injections = [hit];
