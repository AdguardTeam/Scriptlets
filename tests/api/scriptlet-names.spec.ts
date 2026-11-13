import { describe, test, expect } from 'vitest';

import * as scriptletsNamesList from '../../src/scriptlets/scriptlets-names-list';
import { convertScriptletToAdg } from '../../src/converters/converters';
import { isValidScriptletRule } from '../../src/validators';

const TRUSTED_SCRIPTLET_PREFIX = 'trusted-';
const UBO_SCRIPTLET_PREFIX = 'ubo-';

/**
 * Lines of FiltersCompiler `exclusions-high.txt` which exclude rules with uBO aliases of trusted scriptlets
 * from filters which may not use trusted scriptlets, in addition to `#%#//scriptlet('trusted-`,
 * as the aliases do not start with `trusted-`. A rule is excluded if its text contains any of them.
 */
const FILTERS_COMPILER_UBO_TRUSTED_EXCLUSIONS = [
    "#%#//scriptlet('ubo-trusted-",
    '#%#//scriptlet("ubo-trusted-',
    "#%#//scriptlet('ubo-rpnt",
    '#%#//scriptlet("ubo-rpnt',
    "#%#//scriptlet('ubo-replace-node-text",
    '#%#//scriptlet("ubo-replace-node-text',
];

/**
 * Checks whether FiltersCompiler excludes rules with scriptlet `name` from filters
 * which may not use trusted scriptlets, with the name in single and double quotes.
 *
 * @param name Scriptlet name.
 *
 * @returns Array of two booleans, for single and double quotes.
 */
const getExclusionResults = (name: string): boolean[] => [
    `example.org#%#//scriptlet('${name}')`,
    `example.org#%#//scriptlet("${name}")`,
].map((ruleText) => FILTERS_COMPILER_UBO_TRUSTED_EXCLUSIONS.some((exclusion) => ruleText.includes(exclusion)));

const namesLists: string[][] = Object.values(scriptletsNamesList);

const trustedNamesLists = namesLists
    .filter((names) => names[0].startsWith(TRUSTED_SCRIPTLET_PREFIX))
    .map((names): [string, string[]] => [names[0], names]);

const otherNamesLists = namesLists
    .filter((names) => !names[0].startsWith(TRUSTED_SCRIPTLET_PREFIX))
    .map((names): [string, string[]] => [names[0], names]);

/**
 * Trusted scriptlets are recognized by the `trusted-` prefix of their main names,
 * and their uBO aliases by the exclusions of FiltersCompiler, so that they are not run
 * from filters which may not use trusted scriptlets, and other scriptlets are not excluded.
 */
describe('scriptlet names', () => {
    describe('trusted scriptlets', () => {
        test.each(trustedNamesLists)('%s has no aliases except "ubo-" ones', (name, names) => {
            names.slice(1).forEach((alias) => {
                expect(alias.startsWith(UBO_SCRIPTLET_PREFIX)).toBe(true);
            });
        });

        test.each(trustedNamesLists)('%s has only aliases excluded by FiltersCompiler', (name, names) => {
            names.slice(1).forEach((alias) => {
                expect(getExclusionResults(alias)).toEqual([true, true]);
            });
        });
    });

    describe('other scriptlets', () => {
        test.each(otherNamesLists)('%s has no names which start with "trusted-"', (name, names) => {
            names.forEach((alias) => {
                expect(alias.startsWith(TRUSTED_SCRIPTLET_PREFIX)).toBe(false);
            });
        });

        test.each(otherNamesLists)('%s has no names excluded by FiltersCompiler', (name, names) => {
            names.forEach((alias) => {
                expect(getExclusionResults(alias)).toEqual([false, false]);
            });
        });
    });
});

/**
 * uBO aliases of trusted scriptlets, with the uBO names which are converted to them,
 * e.g. `ubo-trusted-rpnt.js` for `trusted-rpnt.js`.
 */
const uboTrustedAliases = trustedNamesLists
    .flatMap(([, names]) => names.slice(1).map((alias): [string, string] => [
        alias,
        alias.slice(UBO_SCRIPTLET_PREFIX.length),
    ]));

/**
 * uBO rules of trusted scriptlets are converted by their uBO names to the uBO aliases,
 * i.e. with `ubo-` prefix, which are valid names of the trusted scriptlets.
 */
describe('uBO aliases of trusted scriptlets', () => {
    test.each(uboTrustedAliases)('%s is the name of uBO rule with %s', (alias, uboName) => {
        const uboRule = `example.org##+js(${uboName}, arg)`;

        expect(isValidScriptletRule(uboRule)).toBe(true);
        expect(convertScriptletToAdg(uboRule)).toEqual([`example.org#%#//scriptlet('${alias}', 'arg')`]);
        expect(isValidScriptletRule(`example.org#%#//scriptlet('${alias}', 'arg')`)).toBe(true);
    });
});
