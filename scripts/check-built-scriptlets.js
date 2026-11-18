import { ESLint } from 'eslint';

/**
 * Globals which built scriptlets may use, but which are not in the `browser` environment of ESLint,
 * e.g. of the Trusted Types API, which is checked with `typeof` before it is used.
 */
const ADDITIONAL_GLOBALS = {
    TrustedScriptURL: 'readonly',
};

/**
 * Returns the names which the code of built scriptlets uses without defining them, for each scriptlet,
 * e.g. a helper which is not listed in the injections of a scriptlet, as a helper used by another one,
 * see `Helper injection mechanism` of AGENTS.md, or a helper of Babel, e.g. `_objectSpread`.
 *
 * @param {{ names: string[], scriptlet: string }[]} scriptlets Built scriptlets, e.g. of `scriptlets.corelibs.json`.
 *
 * @returns {Promise<Record<string, string[]>>} Undefined names by the name of a scriptlet,
 * only for scriptlets which have them.
 */
export const findUndefinedNames = async (scriptlets) => {
    const eslint = new ESLint({
        useEslintrc: false,
        overrideConfig: {
            parserOptions: { ecmaVersion: 2022, sourceType: 'script' },
            env: { browser: true, es2022: true },
            globals: ADDITIONAL_GLOBALS,
            rules: { 'no-undef': 'error' },
        },
    });

    const undefinedNames = {};
    for (let i = 0; i < scriptlets.length; i += 1) {
        const { names, scriptlet } = scriptlets[i];
        // eslint-disable-next-line no-await-in-loop
        const [result] = await eslint.lintText(`(${scriptlet});`);
        const scriptletNames = new Set();
        result.messages.forEach((message) => {
            if (message.ruleId === 'no-undef') {
                const match = message.message.match(/'([^']+)'/);
                if (match) {
                    scriptletNames.add(match[1]);
                }
            } else if (message.fatal) {
                scriptletNames.add(`(parsing error: ${message.message})`);
            }
        });
        if (scriptletNames.size > 0) {
            undefinedNames[names[0]] = Array.from(scriptletNames);
        }
    }

    return undefinedNames;
};
