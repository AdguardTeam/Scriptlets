import {
    replaceAll,
    getBeforeRegExp,
    substringAfter,
    substringBefore,
    wrapInSingleQuotes,
    getStringInBraces,
} from './string-utils';

import { isExisting } from './array-utils';

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
const UBO_SCRIPTLET_JS_ENDING = '.js';

// https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#xhr
const UBO_XHR_TYPE = 'xhr';

const ADG_XHR_TYPE = 'xmlhttprequest';

const ADG_SET_CONSTANT_NAME = 'set-constant';
const ADG_SET_CONSTANT_EMPTY_STRING = '';
const ADG_SET_CONSTANT_EMPTY_ARRAY = 'emptyArr';
const ADG_SET_CONSTANT_EMPTY_OBJECT = 'emptyObj';
const UBO_SET_CONSTANT_EMPTY_STRING = '\'\'';
const UBO_SET_CONSTANT_EMPTY_ARRAY = '[]';
const UBO_SET_CONSTANT_EMPTY_OBJECT = '{}';

const ADG_PREVENT_FETCH_NAME = 'prevent-fetch';
const ADG_PREVENT_FETCH_EMPTY_STRING = '';
const ADG_PREVENT_FETCH_WILDCARD = '*';
const UBO_NO_FETCH_IF_WILDCARD = '/^/';

const ESCAPED_COMMA_SEPARATOR = '\\,';
const COMMA_SEPARATOR = ',';

const REMOVE_ATTR_METHOD = 'removeAttr';
const REMOVE_CLASS_METHOD = 'removeClass';
const REMOVE_ATTR_ALIASES = scriptletList[REMOVE_ATTR_METHOD].names;
const REMOVE_CLASS_ALIASES = scriptletList[REMOVE_CLASS_METHOD].names;
const ADG_REMOVE_ATTR_NAME = REMOVE_ATTR_ALIASES[0];
const ADG_REMOVE_CLASS_NAME = REMOVE_CLASS_ALIASES[0];
const REMOVE_ATTR_CLASS_APPLYING = ['asap', 'stay', 'complete'];

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

const splitArgs = (str) => {
    const args = [];
    let prevArgStart = 0;
    for (let i = 0; i < str.length; i += 1) {
        // do not split args by escaped comma
        // https://github.com/AdguardTeam/Scriptlets/issues/133
        if (str[i] === COMMA_SEPARATOR && str[i - 1] !== '\\') {
            args.push(str.slice(prevArgStart, i).trim());
            prevArgStart = i + 1;
        }
    }
    // collect arg after last comma
    args.push(str.slice(prevArgStart, str.length).trim());
    return args;
};

/**
 * Validates remove-attr/class scriptlet args
 * @param {string[]} parsedArgs
 * @returns {string[]|Error} valid args OR error for invalid selector
 */
const validateRemoveAttrClassArgs = (parsedArgs) => {
    const [name, value, ...restArgs] = parsedArgs;
    // no extra checking if there are only scriptlet name and value
    // https://github.com/AdguardTeam/Scriptlets/issues/235
    if (restArgs.length === 0) {
        return [name, value];
    }

    // remove-attr/class scriptlet might have multiple selectors separated by comma. so we should:
    // 1. check if last arg is 'applying' parameter
    // 2. join 'selector' into one arg
    // 3. combine all args
    // https://github.com/AdguardTeam/Scriptlets/issues/133
    const lastArg = restArgs.pop();
    let applying;
    // check the last parsed arg for matching possible 'applying' vale
    if (REMOVE_ATTR_CLASS_APPLYING.some((el) => lastArg.indexOf(el) > -1)) {
        applying = lastArg;
    } else {
        restArgs.push(lastArg);
    }
    const selector = replaceAll(
        restArgs.join(', '),
        ESCAPED_COMMA_SEPARATOR,
        COMMA_SEPARATOR,
    );
    if (selector.length > 0 && typeof document !== 'undefined') {
        // empty selector is valid for these scriptlets as it applies to all elements,
        // all other selectors should be validated
        // e.g. #%#//scriptlet('ubo-remove-class.js', 'blur', ', html')
        document.querySelectorAll(selector);
    }
    const validArgs = applying
        ? [name, value, selector, applying]
        : [name, value, selector];
    return validArgs;
};

/**
 * Converts string of UBO scriptlet rule to AdGuard scriptlet rule
 * @param {string} rule - UBO scriptlet rule
 * @returns {string[]} - array with one AdGuard scriptlet rule
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
    const argsStr = getStringInBraces(rule);
    let parsedArgs = splitArgs(argsStr);
    const scriptletName = parsedArgs[0].indexOf(UBO_SCRIPTLET_JS_ENDING) > -1
        ? `ubo-${parsedArgs[0]}`
        : `ubo-${parsedArgs[0]}${UBO_SCRIPTLET_JS_ENDING}`;

    if (((REMOVE_ATTR_ALIASES.indexOf(scriptletName) > -1)
        || (REMOVE_CLASS_ALIASES.indexOf(scriptletName) > -1))) {
        parsedArgs = validateRemoveAttrClassArgs(parsedArgs);
    }

    const args = parsedArgs
        .map((arg, index) => {
            let outputArg = arg;
            if (index === 0) {
                outputArg = scriptletName;
            }
            // for example: example.org##+js(abort-current-inline-script, $, popup)
            if (arg === '$') {
                outputArg = '$$';
            }
            return outputArg;
        })
        .map((arg) => wrapInSingleQuotes(arg))
        .join(`${COMMA_SEPARATOR} `);
    const adgRule = replacePlaceholders(
        template,
        { domains, args },
    );
    return [adgRule];
};

/**
 * Convert string of ABP snippet rule to AdGuard scriptlet rule
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
        // abp-rule may have `;` at the end which makes last array item irrelevant
        // https://github.com/AdguardTeam/Scriptlets/issues/236
        .filter(isExisting)
        .map((args) => getSentences(args)
            .map((arg, index) => (index === 0 ? `abp-${arg}` : arg))
            .map((arg) => wrapInSingleQuotes(arg))
            .join(`${COMMA_SEPARATOR} `))
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
        if (parsedName === ADG_SET_CONSTANT_NAME
            // https://github.com/AdguardTeam/FiltersCompiler/issues/102
            && parsedParams[1] === ADG_SET_CONSTANT_EMPTY_STRING) {
            preparedParams = [parsedParams[0], UBO_SET_CONSTANT_EMPTY_STRING];
        } else if (parsedName === ADG_SET_CONSTANT_NAME
            // https://github.com/uBlockOrigin/uBlock-issues/issues/2411
            && parsedParams[1] === ADG_SET_CONSTANT_EMPTY_ARRAY) {
            preparedParams = [parsedParams[0], UBO_SET_CONSTANT_EMPTY_ARRAY];
        } else if (parsedName === ADG_SET_CONSTANT_NAME
            && parsedParams[1] === ADG_SET_CONSTANT_EMPTY_OBJECT) {
            preparedParams = [parsedParams[0], UBO_SET_CONSTANT_EMPTY_OBJECT];
        } else if (parsedName === ADG_PREVENT_FETCH_NAME
            // https://github.com/AdguardTeam/Scriptlets/issues/109
            && (parsedParams[0] === ADG_PREVENT_FETCH_WILDCARD
                || parsedParams[0] === ADG_PREVENT_FETCH_EMPTY_STRING)) {
            preparedParams = [UBO_NO_FETCH_IF_WILDCARD];
        } else if ((parsedName === ADG_REMOVE_ATTR_NAME || parsedName === ADG_REMOVE_CLASS_NAME)
            && parsedParams[1] && parsedParams[1].indexOf(COMMA_SEPARATOR) > -1) {
            preparedParams = [
                parsedParams[0],
                replaceAll(parsedParams[1], COMMA_SEPARATOR, ESCAPED_COMMA_SEPARATOR),
            ];
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
                    .replace(UBO_SCRIPTLET_JS_ENDING, '');

                const args = (preparedParams.length > 0)
                    ? `${uboName}, ${preparedParams.join(`${COMMA_SEPARATOR} `)}`
                    : uboName;

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
 * Checks whether the ADG scriptlet exists or UBO/ABP scriptlet is compatible to ADG
 * @param {string} input - can be ADG or UBO or ABP scriptlet rule
 * @returns {boolean}
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
 * Gets index and redirect resource marker from UBO/ADG modifiers array
 * @param {string[]} modifiers
 * @param {Object} redirectsData validator.REDIRECT_RULE_TYPES.(UBO|ADG)
 * @param {string} rule
 * @returns {Object} { index, marker }
 */
const getMarkerData = (modifiers, redirectsData, rule) => {
    let marker;
    let index = modifiers.findIndex((m) => m.indexOf(redirectsData.redirectRuleMarker) > -1);
    if (index > -1) {
        marker = redirectsData.redirectRuleMarker;
    } else {
        index = modifiers.findIndex((m) => m.indexOf(redirectsData.redirectMarker) > -1);
        if (index > -1) {
            marker = redirectsData.redirectMarker;
        } else {
            throw new Error(`No redirect resource modifier found in rule: ${rule}`);
        }
    }
    return { index, marker };
};

/**
 * Converts Ubo redirect rule to Adg one
 * @param {string} rule
 * @returns {string}
 */
export const convertUboRedirectToAdg = (rule) => {
    const firstPartOfRule = substringBefore(rule, '$');
    const uboModifiers = validator.parseModifiers(rule);
    const uboMarkerData = getMarkerData(uboModifiers, validator.REDIRECT_RULE_TYPES.UBO, rule);

    const adgModifiers = uboModifiers
        .map((modifier, index) => {
            if (index === uboMarkerData.index) {
                const uboName = substringAfter(modifier, uboMarkerData.marker);
                const adgName = validator.REDIRECT_RULE_TYPES.UBO.compatibility[uboName];
                const adgMarker = uboMarkerData.marker === validator.ADG_UBO_REDIRECT_RULE_MARKER
                    ? validator.REDIRECT_RULE_TYPES.ADG.redirectRuleMarker
                    : validator.REDIRECT_RULE_TYPES.ADG.redirectMarker;
                return `${adgMarker}${adgName}`;
            }
            if (modifier === UBO_XHR_TYPE) {
                return ADG_XHR_TYPE;
            }
            return modifier;
        })
        .join(COMMA_SEPARATOR);

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
        .map((modifier) => {
            if (modifier.indexOf(validator.REDIRECT_RULE_TYPES.ABP.redirectMarker) > -1) {
                const abpName = substringAfter(
                    modifier,
                    validator.REDIRECT_RULE_TYPES.ABP.redirectMarker,
                );
                const adgName = validator.REDIRECT_RULE_TYPES.ABP.compatibility[abpName];
                return `${validator.REDIRECT_RULE_TYPES.ADG.redirectMarker}${adgName}`;
            }
            return modifier;
        })
        .join(COMMA_SEPARATOR);

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
 * 2. Parses the rule and checks if there are any source type modifiers which are required by Ubo
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

    const adgMarkerData = getMarkerData(adgModifiers, validator.REDIRECT_RULE_TYPES.ADG, rule);

    const adgRedirectName = adgModifiers[adgMarkerData.index].slice(adgMarkerData.marker.length);

    if (!validator.hasValidContentType(rule)) {
        // add missed source types as content type modifiers
        const sourceTypesData = validator.ABSENT_SOURCE_TYPE_REPLACEMENT
            .find((el) => el.NAME === adgRedirectName);
        if (typeof sourceTypesData === 'undefined') {
            // eslint-disable-next-line max-len
            throw new Error(`Unable to convert for uBO - no types to add for specific redirect in rule: ${rule}`);
        }
        const additionModifiers = sourceTypesData.TYPES;
        adgModifiers.push(...additionModifiers);
    }

    const uboModifiers = adgModifiers
        .map((el, index) => {
            if (index === adgMarkerData.index) {
                const uboMarker = adgMarkerData.marker === validator.ADG_UBO_REDIRECT_RULE_MARKER
                    ? validator.REDIRECT_RULE_TYPES.UBO.redirectRuleMarker
                    : validator.REDIRECT_RULE_TYPES.UBO.redirectMarker;
                // eslint-disable-next-line max-len
                const uboRedirectName = validator.REDIRECT_RULE_TYPES.ADG.compatibility[adgRedirectName];
                return `${uboMarker}${uboRedirectName}`;
            }
            return el;
        })
        .join(COMMA_SEPARATOR);

    return `${basePart}$${uboModifiers}`;
};
