import {
    getBeforeRegExp,
    substringAfter,
    substringBefore,
    wrapInDoubleQuotes,
    getStringInBraces,
} from './string-utils';

import {
    UBO_SCRIPTLET_MASK_REG,
    ABP_SCRIPTLET_MASK,
    ABP_SCRIPTLET_EXCEPTION_MASK,
    isComment,
    isAdgScriptletRule,
    isUboScriptletRule,
    isAbpSnippetRule,
    ADG_UBO_REDIRECT_RESOURCE_MARKER,
    ABP_REDIRECT_RESOURCE_MARKER,
    uboToAdgCompatibility,
    abpToAdgCompatibility,
    adgToUboCompatibility,
    parseModifiers,
    getRedirectName,
    isAdgRedirectResourceRule,
    isUboRedirectResourceRule,
    isAbpRewriteResourceRule,
    isValidRedirectRule,
} from './validator';

import { parseRule } from './parse-rule';

import * as scriptletList from '../scriptlets/scriptletsList';

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
// eslint-disable-next-line no-template-curly-in-string
const UBO_SCRIPTLET_TEMPLATE = '${domains}##+js(${args})';
// eslint-disable-next-line no-template-curly-in-string
const UBO_SCRIPTLET_EXCEPTION_TEMPLATE = '${domains}#@#+js(${args})';

const UBO_ALIAS_NAME_MARKER = 'ubo-';

// https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#xhr
const UBO_XHR_TYPE = 'xhr';

const ADG_XHR_TYPE = 'xmlhttprequest';


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
 * Converts string of UBO scriptlet rule to AdGuard scritlet rule
 * @param {string} rule - UBO scriptlet rule
 * @returns {Array} - array with one AdGuard scriptlet rule
 */
export const convertUboScriptletToAdg = (rule) => {
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
        .map((arg, index) => {
            let outputArg;
            if (index === 0) {
                outputArg = (arg.indexOf('.js') > -1) ? `ubo-${arg}` : `ubo-${arg}.js`;
            } else {
                outputArg = arg;
            }
            return outputArg;
        })
        .map((arg) => (wrapInDoubleQuotes(arg)))
        .join(', ');
    const adgRule = replacePlaceholders(
        template,
        { domains, args },
    );
    return [adgRule];
};

/**
 * Convert string of ABP snippet rule to AdGuard scritlet rule
 * @param {string} rule - ABP snippet rule
 * @returns {Array} - array of AdGuard scriptlet rules -
 * one or few items depends on Abp-rule
 */
export const convertAbpSnippetToAdg = (rule) => {
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
 * @param {string} rule
 * @returns {Array} - array of AdGuard scriptlet rules -
 * one item for Adg and Ubo or few items for Abp
 */
export const convertScriptletToAdg = (rule) => {
    let result;
    if (isUboScriptletRule(rule)) {
        result = convertUboScriptletToAdg(rule);
    } else if (isAbpSnippetRule(rule)) {
        result = convertAbpSnippetToAdg(rule);
    } else if (isAdgScriptletRule(rule) || (isComment(rule))) {
        result = [rule];
    }

    return result;
};

/**
 * Converts UBO scriptlet rule to AdGuard one
 * @param {string} rule - AdGuard scriptlet rule
 * @returns {string} - UBO scriptlet rule
 */
export const convertAdgScriptletToUbo = (rule) => {
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
            .find((el) => (el.name === parsedName
                || el.aliases.indexOf(parsedName) >= 0));

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
                const uboName = uboAlias
                    .replace(UBO_ALIAS_NAME_MARKER, '')
                    // '.js' in the Ubo scriptlet name can be omitted
                    // https://github.com/gorhill/uBlock/wiki/Resources-Library#general-purpose-scriptlets
                    .replace('.js', '');

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

/**
 * Converts Ubo redirect rule to Adg one
 * @param {String} rule
 * @returns {String}
 */
export const convertUboRedirectToAdg = (rule) => {
    const firstPartOfRule = substringBefore(rule, '$');
    const uboModifiers = parseModifiers(rule);
    const adgModifiers = uboModifiers
        .map((el) => {
            if (el.indexOf(ADG_UBO_REDIRECT_RESOURCE_MARKER) > -1) {
                const uboName = getRedirectName(rule, ADG_UBO_REDIRECT_RESOURCE_MARKER);
                const adgName = uboToAdgCompatibility[`${uboName}`]; // redirect names may contain '-'
                return `${ADG_UBO_REDIRECT_RESOURCE_MARKER}${adgName}`;
            }
            if (el === UBO_XHR_TYPE) {
                return ADG_XHR_TYPE;
            }
            return el;
        })
        .join(',');

    return `${firstPartOfRule}$${adgModifiers}`;
};

/**
 * Converts Abp redirect rule to Adg one
 * @param {String} rule
 * @returns {String}
 */
export const convertAbpRedirectToAdg = (rule) => {
    const firstPartOfRule = substringBefore(rule, '$');
    const abpModifiers = parseModifiers(rule);
    const adgModifiers = abpModifiers
        .map((el) => {
            if (el.indexOf(ABP_REDIRECT_RESOURCE_MARKER) > -1) {
                const abpName = getRedirectName(rule, ABP_REDIRECT_RESOURCE_MARKER);
                const adgName = abpToAdgCompatibility[`${abpName}`]; // redirect names may contain '-'
                return `${ADG_UBO_REDIRECT_RESOURCE_MARKER}${adgName}`;
            }
            return el;
        })
        .join(',');

    return `${firstPartOfRule}$${adgModifiers}`;
};

/**
 * Converts redirect rule to AdGuard one
 * @param {*} rule
 */
export const convertRedirectToAdg = (rule) => {
    let result;
    if (isUboRedirectResourceRule(rule)) {
        result = convertUboRedirectToAdg(rule);
    } else if (isAbpRewriteResourceRule(rule)) {
        result = convertAbpRedirectToAdg(rule);
    } else if (isAdgRedirectResourceRule(rule) || (isComment(rule))) {
        result = rule;
    }

    return result;
};

/**
 * Converts Adg redirect rule to Ubo one
 * @param {String} rule
 * @returns {String}
 */
export const convertAdgRedirectToUbo = (rule) => {
    if (!isValidRedirectRule(rule)) {
        throw new Error(`Rule is not valid for converting to Ubo.
Source type is not specified in the rule: ${rule}`);
    } else {
        const firstPartOfRule = substringBefore(rule, '$');
        const uboModifiers = parseModifiers(rule);
        const adgModifiers = uboModifiers
            .map((el) => {
                if (el.indexOf(ADG_UBO_REDIRECT_RESOURCE_MARKER) > -1) {
                    const adgName = getRedirectName(rule, ADG_UBO_REDIRECT_RESOURCE_MARKER);
                    const uboName = adgToUboCompatibility[`${adgName}`]; // redirect names may contain '-'
                    return `${ADG_UBO_REDIRECT_RESOURCE_MARKER}${uboName}`;
                }
                return el;
            })
            .join(',');

        return `${firstPartOfRule}$${adgModifiers}`;
    }
};
