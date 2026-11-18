import { describe, expect, test } from 'vitest';

import { findUndefinedNames } from '../../scripts/check-built-scriptlets';

/**
 * Creates the code of a built scriptlet as in `scriptlets.corelibs.json`, i.e. one function, in which
 * its injections are defined after its own code.
 *
 * @param body Code of the scriptlet.
 * @param injections Code of the injected helpers.
 *
 * @returns Code of the scriptlet.
 */
const createScriptlet = (body: string, injections: string[] = []): string => [
    'function scriptlet(source, args) {',
    body,
    ...injections,
    '}',
].join('\n');

describe('findUndefinedNames', () => {
    test('reports a helper which a scriptlet or another helper calls without its injection', async () => {
        const undefinedNames = await findUndefinedNames([
            {
                names: ['json-prune'],
                // `jsonPath()` calls `extractRegexAndReplacement()`, which is not injected
                scriptlet: createScriptlet('jsonPath(args[0]);', [
                    'function jsonPath(path) { return extractRegexAndReplacement(path); }',
                ]),
            },
            {
                names: ['set-constant'],
                scriptlet: createScriptlet('getDescriptorAddon(); randomId();', [
                    'function getDescriptorAddon() { return randomId(); }',
                    'function randomId() { return Math.random().toString(36); }',
                ]),
            },
        ]);
        expect(undefinedNames).toEqual({ 'json-prune': ['extractRegexAndReplacement'] });
    });

    test('accepts globals of browsers, also of the Trusted Types API', async () => {
        const undefinedNames = await findUndefinedNames([{
            names: ['prevent-element-src-loading'],
            scriptlet: createScriptlet(
                'if (typeof TrustedScriptURL !== "undefined" && window.trustedTypes) { document.createElement("a"); }',
            ),
        }]);
        expect(undefinedNames).toEqual({});
    });

    test('reports a helper of Babel which the bundled runtime does not have', async () => {
        const undefinedNames = await findUndefinedNames([{
            names: ['set-attr'],
            scriptlet: createScriptlet('var settings = _objectSpread({}, args[0]);'),
        }]);
        expect(undefinedNames).toEqual({ 'set-attr': ['_objectSpread'] });
    });

    test('reports code which cannot be parsed', async () => {
        const undefinedNames = await findUndefinedNames([{ names: ['broken'], scriptlet: 'function (' }]);
        expect(Object.keys(undefinedNames)).toEqual(['broken']);
    });
});
