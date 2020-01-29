import {
    getBeforeRegExp,
    substringAfter,
    substringBefore,
    wrapInDoubleQuotes,
    getStringInBraces,
} from './string-utils';

import { ADG_SCRIPTLET_MASK } from './parse-rule';

/**
 * AdGuard scriptlet rule
 */
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
 * Return array of strings separated by space which not in quotes
 * @param {string} str
 */
const getSentences = (str) => {
    const reg = /'.*?'|".*?"|\S+/g;
    return str.match(reg);
};

/**
 * Replace string with data by placeholders
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
 * Check is AdGuard scriptlet rule
 * @param {string} rule rule text
 */
export const isAdgScriptletRule = (rule) => {
    return rule.indexOf(ADG_SCRIPTLET_MASK) > -1;
};

/**
 * Check is uBO scriptlet rule
 * @param {string} rule rule text
 */
export const isUboScriptletRule = (rule) => {
    return (
        rule.indexOf(UBO_SCRIPTLET_MASK_1) > -1
        || rule.indexOf(UBO_SCRIPTLET_MASK_2) > -1
        || rule.indexOf(UBO_SCRIPTLET_EXCEPTION_MASK_1) > -1
        || rule.indexOf(UBO_SCRIPTLET_EXCEPTION_MASK_2) > -1
    )
        && UBO_SCRIPTLET_MASK_REG.test(rule);
};

/**
 * Check is AdBlock Plus snippet
 * @param {string} rule rule text
 */
export const isAbpSnippetRule = (rule) => {
    return (
        rule.indexOf(ABP_SCRIPTLET_MASK) > -1
        || rule.indexOf(ABP_SCRIPTLET_EXCEPTION_MASK) > -1
    )
    && rule.search(ADG_CSS_MASK_REG) === -1;
};

/**
 * Convert string of UBO scriptlet rule to AdGuard scritlet rule
 * @param {string} rule UBO scriptlet rule
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

    return replacePlaceholders(
        template,
        { domains, args },
    ).split();
};

/**
 * Convert string of ABP scriptlet rule to AdGuard scritlet rule
 * @param {string} rule ABP scriptlet rule
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
    } else if (isAdgScriptletRule(rule)) {
        result = rule;
    }

    return result;
};
