import { hit } from '../helpers';

/**
 * Wraps the `console.dir` API to call the `toString`
 * method of the argument.
 * @param {Source} source
 * @param {string|number} times the number of times to call the
 * `toString` method of the argument to `console.dir`.
 */
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
