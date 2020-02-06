import {
    getBeforeRegExp,
    startsWith,
    substringAfter,
    substringBefore,
    wrapInDoubleQuotes,
    getStringInBraces,
} from './string-utils';

import { parseRule, ADG_SCRIPTLET_MASK } from './parse-rule';

import * as scriptletList from '../scriptlets/scriptletsList';


const COMMENT_MARKER = '!';

/**
 * AdGuard scriptlet rule
 */
const ADGUARD_SCRIPTLET_MASK_REG = /#@?%#\/\/scriptlet\(.+\)/;
// eslint-disable-next-line no-template-curly-in-string
const ADGUARD_SCRIPTLET_TEMPLATE = '${domains}#%#//scriptlet(${args})';
// eslint-disable-next-line no-template-curly-in-string
const ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE = '${domains}#@%#//scriptlet(${args})';

/**
 * uBlock scriptlet rule mask
 */
const UBO_SCRIPTLET_MASK_REG = /#@?#script:inject|#@?#\s*\+js/;
const UBO_SCRIPTLET_MASK_1 = '##+js';
const UBO_SCRIPTLET_MASK_2 = '##script:inject';
const UBO_SCRIPTLET_EXCEPTION_MASK_1 = '#@#+js';
const UBO_SCRIPTLET_EXCEPTION_MASK_2 = '#@#script:inject';
// eslint-disable-next-line no-template-curly-in-string
const UBO_SCRIPTLET_TEMPLATE = '${domains}##+js(${args})';
// eslint-disable-next-line no-template-curly-in-string
const UBO_SCRIPTLET_EXCEPTION_TEMPLATE = '${domains}#@#+js(${args})';

const UBO_ALIAS_NAME_MARKER = 'ubo-';

/**
 * AdBlock Plus snippet rule mask
 */
const ABP_SCRIPTLET_MASK = '#$#';
const ABP_SCRIPTLET_EXCEPTION_MASK = '#@$#';

/**
 * AdGuard CSS rule mask
 */
const ADG_CSS_MASK_REG = /#@?\$#.+?\s*\{.*\}\s*$/g;

/**
 * Returns array of strings separated by space which not in quotes
 * @param {string} str
 */
const getSentences = (str) => {
    const reg = /'.*?'|".*?"|\S+/g;
    return str.match(reg);
};

/**
 * Replaces string with data by placeholders
 * @param {string} str
 * @param {Object} data - where keys are placeholders names
 */
const replacePlaceholders = (str, data) => {
    return Object.keys(data).reduce((acc, key) => {
        const reg = new RegExp(`\\$\\{${key}\\}`, 'g');
        acc = acc.replace(reg, data[key]);
        return acc;
    }, str);
};


/**
 * Checks if rule text is comment e.g. !!example.org##+js(set-constant.js, test, false)
 * @param {string} rule
 * @return {boolean}
 */
export const isComment = (rule) => startsWith(rule, COMMENT_MARKER);

/**
 * Checks is AdGuard scriptlet rule
 * @param {string} rule rule text
 */
export const isAdgScriptletRule = (rule) => {
    return (
        !isComment(rule)
        && rule.indexOf(ADG_SCRIPTLET_MASK) > -1
    );
};

/**
 * Checks is uBO scriptlet rule
 * @param {string} rule rule text
 */
export const isUboScriptletRule = (rule) => {
    return (
        rule.indexOf(UBO_SCRIPTLET_MASK_1) > -1
        || rule.indexOf(UBO_SCRIPTLET_MASK_2) > -1
        || rule.indexOf(UBO_SCRIPTLET_EXCEPTION_MASK_1) > -1
        || rule.indexOf(UBO_SCRIPTLET_EXCEPTION_MASK_2) > -1
    )
        && UBO_SCRIPTLET_MASK_REG.test(rule)
        && !isComment(rule);
};

/**
 * Checks is AdBlock Plus snippet
 * @param {string} rule rule text
 */
export const isAbpSnippetRule = (rule) => {
    return (
        rule.indexOf(ABP_SCRIPTLET_MASK) > -1
        || rule.indexOf(ABP_SCRIPTLET_EXCEPTION_MASK) > -1
    )
    && rule.search(ADG_CSS_MASK_REG) === -1
    && !isComment(rule);
};

/**
 * Converts string of UBO scriptlet rule to AdGuard scritlet rule
 * @param {String} rule - UBO scriptlet rule
 */
export const convertUboToAdg = (rule) => {
    const domains = getBeforeRegExp(rule, UBO_SCRIPTLET_MASK_REG);
    const mask = rule.match(UBO_SCRIPTLET_MASK_REG)[0];
    let template;
    if (mask.indexOf('@') > -1) {
        template = ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE;
    } else {
        template = ADGUARD_SCRIPTLET_TEMPLATE;
    }
    const args = getStringInBraces(rule)
        .split(/, /g)
        .map((arg, index) => (index === 0 ? `ubo-${arg}` : arg))
        .map((arg) => (wrapInDoubleQuotes(arg)))
        .join(', ');
    const adgRule = replacePlaceholders(
        template,
        { domains, args },
    );
    return [adgRule];
};

/**
 * Convert string of ABP scriptlet rule to AdGuard scritlet rule
 * @param {String} rule - ABP scriptlet rule
 */
export const convertAbpToAdg = (rule) => {
    const SEMICOLON_DIVIDER = /;(?=(?:(?:[^"]*"){2})*[^"]*$)/g;
    const mask = rule.indexOf(ABP_SCRIPTLET_MASK) > -1
        ? ABP_SCRIPTLET_MASK
        : ABP_SCRIPTLET_EXCEPTION_MASK;
    const template = mask === ABP_SCRIPTLET_MASK
        ? ADGUARD_SCRIPTLET_TEMPLATE
        : ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE;
    const domains = substringBefore(rule, mask);
    const args = substringAfter(rule, mask);

    return args.split(SEMICOLON_DIVIDER)
        .map((args) => getSentences(args)
            .filter((arg) => arg)
            .map((arg, index) => (index === 0 ? `abp-${arg}` : arg))
            .map((arg) => wrapInDoubleQuotes(arg))
            .join(', '))
        .map((args) => replacePlaceholders(template, { domains, args }));
};

/**
 * Converts scriptlet rule to AdGuard one
 * @param {*} rule
 */
export const convertScriptletToAdg = (rule) => {
    let result;
    if (isUboScriptletRule(rule)) {
        result = convertUboToAdg(rule);
    } else if (isAbpSnippetRule(rule)) {
        result = convertAbpToAdg(rule);
    } else if (isAdgScriptletRule(rule) || (isComment(rule))) {
        result = rule;
    }

    return result;
};

/**
 * Converts UBO scriptlet rule to AdGuard one
 * @param {String} rule - AdGuard scriptlet rule
 * @returns {String} - UBO scriptlet rule
 */
export const convertAdgToUbo = (rule) => {
    let res;

    if (isAdgScriptletRule(rule)) {
        const { name: parsedName, args: parsedParams } = parseRule(rule);

        // object of name and aliases for the Adg-scriptlet
        const adgScriptletObject = Object
            .keys(scriptletList)
            .map((el) => scriptletList[el])
            .map((s) => {
                const [name, ...aliases] = s.names;
                return { name, aliases };
            })
            .find((el) => (el.name === parsedName));

        const { aliases } = adgScriptletObject;

        if (aliases.length > 0) {
            const uboAlias = adgScriptletObject.aliases
                // eslint-disable-next-line no-restricted-properties
                .find((alias) => (alias.includes(UBO_ALIAS_NAME_MARKER)));

            if (uboAlias) {
                const mask = rule.match(ADGUARD_SCRIPTLET_MASK_REG)[0];
                let template;
                if (mask.indexOf('@') > -1) {
                    template = UBO_SCRIPTLET_EXCEPTION_TEMPLATE;
                } else {
                    template = UBO_SCRIPTLET_TEMPLATE;
                }
                const domains = getBeforeRegExp(rule, ADGUARD_SCRIPTLET_MASK_REG);
                const uboName = uboAlias.replace(UBO_ALIAS_NAME_MARKER, '');

                const args = (parsedParams.length > 0) ? `${uboName}, ${parsedParams.join(', ')}` : uboName;

                const uboRule = replacePlaceholders(
                    template,
                    { domains, args },
                );

                res = uboRule;
            }
        }
    }

    return res;
};
