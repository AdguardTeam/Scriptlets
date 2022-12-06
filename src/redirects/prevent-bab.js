import { preventBab as preventBabScriptlet } from '../scriptlets/prevent-bab';

/**
 * @redirect prevent-bab
 *
 * @description
 * Prevents BlockAdblock script from detecting an ad blocker.
 *
 * Mostly it is used as `scriptlet`.
 * See [scriptlet description](../wiki/about-scriptlets.md#prevent-bab).
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/nobab.js
 *
 * **Example**
 * ```
 * /blockadblock.$script,redirect=prevent-bab
 * ```
 */
const preventBab = preventBabScriptlet;
preventBab.names = [
    'prevent-bab',
    // list of prevent-bab redirect aliases
    'nobab.js',
    'ubo-nobab.js',
    'bab-defuser.js',
    'ubo-bab-defuser.js',
    'ubo-nobab',
    'ubo-bab-defuser',
];

export { preventBab };
