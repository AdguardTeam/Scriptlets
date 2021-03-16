import {
    getBeforeRegExp,
    substringAfter,
    substringBefore,
    wrapInSingleQuotes,
    getStringInBraces,
} from './string-utils';

import validator from './validator';

import { parseRule } from './parse-rule';

import * as scriptletList from '../scriptlets/scriptlets-list';

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

const ADG_SET_CONSTANT_NAME = 'set-constant';
const ADG_SET_CONSTANT_EMPTY_STRING = '';
const UBO_SET_CONSTANT_EMPTY_STRING = '\'\'';

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
    const domains = getBeforeRegExp(rule, validator.UBO_SCRIPTLET_MASK_REG);
    const mask = rule.match(validator.UBO_SCRIPTLET_MASK_REG)[0];
    let template;
    if (mask.indexOf('@') > -1) {
        template = ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE;
    } else {
        template = ADGUARD_SCRIPTLET_TEMPLATE;
    }
    let parsedArgs = getStringInBraces(rule).split(/,\s/g);
    if (parsedArgs.length === 1) {
        // Most probably this is not correct separator, in this case we use ','
        parsedArgs = getStringInBraces(rule).split(/,/g);
    }
    const args = parsedArgs
        .map((arg, index) => {
            let outputArg;
            if (index === 0) {
                outputArg = (arg.indexOf('.js') > -1) ? `ubo-${arg}` : `ubo-${arg}.js`;
            } else {
                outputArg = arg;
            }
            // for example: dramaserial.xyz##+js(abort-current-inline-script, $, popup)
            if (arg === '$') {
                outputArg = '$$';
            }
            return outputArg;
        })
        .map((arg) => wrapInSingleQuotes(arg))
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
    const mask = rule.indexOf(validator.ABP_SCRIPTLET_MASK) > -1
        ? validator.ABP_SCRIPTLET_MASK
        : validator.ABP_SCRIPTLET_EXCEPTION_MASK;
    const template = mask === validator.ABP_SCRIPTLET_MASK
        ? ADGUARD_SCRIPTLET_TEMPLATE
        : ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE;
    const domains = substringBefore(rule, mask);
    const args = substringAfter(rule, mask);

    return args.split(SEMICOLON_DIVIDER)
        .map((args) => getSentences(args)
            .filter((arg) => arg)
            .map((arg, index) => (index === 0 ? `abp-${arg}` : arg))
            .map((arg) => wrapInSingleQuotes(arg))
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
    if (validator.isUboScriptletRule(rule)) {
        result = convertUboScriptletToAdg(rule);
    } else if (validator.isAbpSnippetRule(rule)) {
        result = convertAbpSnippetToAdg(rule);
    } else if (validator.isAdgScriptletRule(rule) || (validator.isComment(rule))) {
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

    if (validator.isAdgScriptletRule(rule)) {
        const { name: parsedName, args: parsedParams } = parseRule(rule);

        let preparedParams;
        // https://github.com/AdguardTeam/FiltersCompiler/issues/102
        if (parsedName === ADG_SET_CONSTANT_NAME
            && parsedParams[1] === ADG_SET_CONSTANT_EMPTY_STRING) {
            preparedParams = [parsedParams[0], UBO_SET_CONSTANT_EMPTY_STRING];
        } else {
            preparedParams = parsedParams;
        }

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
                .find((alias) => alias.includes(UBO_ALIAS_NAME_MARKER));

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

                const args = (preparedParams.length > 0) ? `${uboName}, ${preparedParams.join(', ')}` : uboName;

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
 * Validates any scriptlet rule
 * @param {string} input - can be Adguard or Ubo or Abp scriptlet rule
 */
export const isValidScriptletRule = (input) => {
    if (!input) {
        return false;
    }
    // ABP 'input' rule may contain more than one snippet
    const rulesArray = convertScriptletToAdg(input);

    // checking if each of parsed scriptlets is valid
    // if at least one of them is not valid - whole 'input' rule is not valid too
    const isValid = rulesArray.every((rule) => {
        const parsedRule = parseRule(rule);
        return validator.isValidScriptletName(parsedRule.name);
    });

    return isValid;
};

/**
 * Converts Ubo redirect rule to Adg one
 * @param {string} rule
 * @returns {string}
 */
export const convertUboRedirectToAdg = (rule) => {
    const firstPartOfRule = substringBefore(rule, '$');
    const uboModifiers = validator.parseModifiers(rule);
    const adgModifiers = uboModifiers
        .map((el) => {
            if (el.indexOf(validator.REDIRECT_RULE_TYPES.UBO.marker) > -1) {
                const uboName = substringAfter(el, validator.REDIRECT_RULE_TYPES.UBO.marker);
                const adgName = validator.REDIRECT_RULE_TYPES.UBO.compatibility[uboName];
                return `${validator.REDIRECT_RULE_TYPES.ADG.marker}${adgName}`;
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
 * @param {string} rule
 * @returns {string}
 */
export const convertAbpRedirectToAdg = (rule) => {
    const firstPartOfRule = substringBefore(rule, '$');
    const abpModifiers = validator.parseModifiers(rule);
    const adgModifiers = abpModifiers
        .map((el) => {
            if (el.indexOf(validator.REDIRECT_RULE_TYPES.ABP.marker) > -1) {
                const abpName = substringAfter(el, validator.REDIRECT_RULE_TYPES.ABP.marker);
                const adgName = validator.REDIRECT_RULE_TYPES.ABP.compatibility[abpName];
                return `${validator.REDIRECT_RULE_TYPES.ADG.marker}${adgName}`;
            }
            return el;
        })
        .join(',');

    return `${firstPartOfRule}$${adgModifiers}`;
};

/**
 * Converts redirect rule to AdGuard one
 * @param {string} rule
 * @returns {string}
 */
export const convertRedirectToAdg = (rule) => {
    let result;
    if (validator.isUboRedirectCompatibleWithAdg(rule)) {
        result = convertUboRedirectToAdg(rule);
    } else if (validator.isAbpRedirectCompatibleWithAdg(rule)) {
        result = convertAbpRedirectToAdg(rule);
    } else if (validator.isValidAdgRedirectRule(rule)) {
        result = rule;
    }

    return result;
};

/**
 * Converts Adg redirect rule to Ubo one
 * 1. Checks if there is Ubo analog for Adg rule
 * 2. Parses the rule and chechs if there are any source type modifiers which are required by Ubo
 *    and if there are no one we add it manually to the end.
 *    Source types are chosen according to redirect name
 *    e.g. ||ad.com^$redirect=<name>,important  ->>  ||ad.com^$redirect=<name>,important,script
 * 3. Replaces Adg redirect name by Ubo analog
 * @param {string} rule
 * @returns {string}
 */
export const convertAdgRedirectToUbo = (rule) => {
    if (!validator.isAdgRedirectCompatibleWithUbo(rule)) {
        throw new Error(`Unable to convert for uBO - unsupported redirect in rule: ${rule}`);
    }

    const basePart = substringBefore(rule, '$');
    const adgModifiers = validator.parseModifiers(rule);

    const adgRedirectModifier = adgModifiers
        .find((el) => el.indexOf(validator.REDIRECT_RULE_TYPES.ADG.marker) > -1);
    const adgRedirectName = adgRedirectModifier
        .slice(validator.REDIRECT_RULE_TYPES.ADG.marker.length);
    const uboRedirectName = validator.REDIRECT_RULE_TYPES.ADG.compatibility[adgRedirectName];
    const uboRedirectModifier = `${validator.REDIRECT_RULE_TYPES.UBO.marker}${uboRedirectName}`;

    if (!validator.hasValidContentType(rule)) {
        // add missed source types as content type modifiers
        const sourceTypesData = validator.ABSENT_SOURCE_TYPE_REPLACEMENT
            .find((el) => el.NAME === adgRedirectName);
        const additionModifiers = sourceTypesData.TYPES;
        adgModifiers.push(...additionModifiers);
    }

    const uboModifiers = adgModifiers
        .map((el) => {
            if (el === adgRedirectModifier) {
                return uboRedirectModifier;
            }
            return el;
        })
        .join(',');

    return `${basePart}$${uboModifiers}`;
};
