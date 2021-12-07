import { hit } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet dir-string
 *
 * @description
 * Wraps the `console.dir` API to call the `toString` method of the argument.
 * There are several adblock circumvention systems that detect browser devtools
 * and hide themselves. Therefore, if we force them to think
 * that devtools are open (using this scriptlet),
 * it will automatically disable the adblock circumvention script.
 *
 * Related ABP source:
 * https://github.com/adblockplus/adblockpluscore/blob/6b2a309054cc23432102b85d13f12559639ef495/lib/content/snippets.js#L766
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('dir-string'[, times])
 * ```
 * - `times` - optional, the number of times to call the `toString` method of the argument to `console.dir`
 *
 * **Example**
 * ```
 * ! Run 2 times
 * example.org#%#//scriptlet('dir-string', '2')
 * ```
 */
/* eslint-enable max-len */
export function dirString(source, times) {
    const { dir } = console;
    times = parseInt(times, 10);

    function dirWrapper(object) {
        // eslint-disable-next-line no-unused-vars
        let temp;
        for (let i = 0; i < times; i += 1) {
            // eslint-disable-next-line no-unused-expressions
            temp = `${object}`;
        }
        if (typeof dir === 'function') {
            dir.call(this, object);
        }
        hit(source, temp);
    }
    // eslint-disable-next-line no-console
    console.dir = dirWrapper;
}

dirString.names = [
    'dir-string',
    'abp-dir-string',
];

dirString.injections = [hit];
