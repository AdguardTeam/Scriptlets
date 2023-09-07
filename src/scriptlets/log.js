/**
 * @scriptlet log
 *
 * @description
 * A simple scriptlet which only purpose is to print arguments to console.
 * This scriptlet can be helpful for debugging and troubleshooting other scriptlets.
 *
 * Related ABP source:
 * https://gitlab.com/eyeo/snippets/-/blob/main/source/introspection/log.js
 *
 * ### Examples
 *
 * ```adblock
 * example.org#%#//scriptlet('log', 'arg1', 'arg2')
 * ```
 *
 * @added v1.0.4.
 */
export function log(...args) {
    console.log(args); // eslint-disable-line no-console
}
log.names = [
    'log',
    'abp-log',
];
