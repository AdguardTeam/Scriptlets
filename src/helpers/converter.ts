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

import { ADG_SCRIPTLET_MASK, parseRule } from './parse-rule';

import * as scriptletList from '../scriptlets/scriptlets-list';

type AdgScriptletObject = {
    name: string;
    aliases: string[];
};

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
const REMOVE_ATTR_CLASS_APPLYING = ['asap', 'stay', 'complete'];

const ABP_RESOURCE_MARKER = 'abp-resource:';

/**
 * Possible rule origins.
 */
enum Origin {
    Ubo = 'ubo',
    Abp = 'abp',
    AdgValid = 'adgValid',
    AdgInvalid = 'adgInvalid',
}

/**
 * Array of origin names in the order they must be checked for rule conversion.
 */
const originNames = [
    Origin.Ubo,
    Origin.Abp,
    Origin.AdgValid,
    Origin.AdgInvalid,
];

/**
 * Returns array of strings separated by space which is not in quotes
 *
 * @param str arbitrary string
 * @returns result array
 * @throws
 */
const getAbpSnippetArguments = (str: string): RegExpMatchArray => {
    const reg = /'.*?'|".*?"|\S+/g;
    const sentences = str.match(reg);
    if (!sentences) {
        throw new Error('Invalid ABP snippet args.');
    }
    return sentences;
};

/**
 * Replaces string with data by placeholders
 *
 * @param str string with placeholders
 * @param data where keys are placeholders names
 * @returns string filled with data
 */
const replacePlaceholders = (str: string, data: Record<string, string>): string => {
    return Object.keys(data).reduce((acc, key) => {
        const reg = new RegExp(`\\$\\{${key}\\}`, 'g');
        acc = acc.replace(reg, data[key]);
        return acc;
    }, str);
};

const splitArgs = (str: string): string[] => {
    const args: string[] = [];
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
 *
 * @param parsedArgs scriptlet arguments
 * @returns valid args OR error for invalid selector
 */
const validateRemoveAttrClassArgs = (parsedArgs: string[]): string[] => {
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
    const lastArg = restArgs.pop() as string; // https://github.com/microsoft/TypeScript/issues/30406
    let applying;
    // check the last parsed arg for matching possible 'applying' vale
    if (REMOVE_ATTR_CLASS_APPLYING.some((el) => lastArg.includes(el))) {
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
 *
 * @param rule UBO scriptlet rule
 * @returns array with one AdGuard scriptlet rule
 */
export const convertUboScriptletToAdg = (rule: string): string[] => {
    const domains = getBeforeRegExp(rule, validator.UBO_SCRIPTLET_MASK_REG);
    const matchResult = rule.match(validator.UBO_SCRIPTLET_MASK_REG);
    const mask = Array.isArray(matchResult) ? matchResult[0] : null;
    let template;
    if (mask?.includes('@')) {
        template = ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE;
    } else {
        template = ADGUARD_SCRIPTLET_TEMPLATE;
    }
    const argsStr = getStringInBraces(rule);
    let parsedArgs = splitArgs(argsStr);
    const scriptletName = parsedArgs[0].includes(UBO_SCRIPTLET_JS_ENDING)
        ? `ubo-${parsedArgs[0]}`
        : `ubo-${parsedArgs[0]}${UBO_SCRIPTLET_JS_ENDING}`;

    if (REMOVE_ATTR_ALIASES.includes(scriptletName) || REMOVE_CLASS_ALIASES.includes(scriptletName)) {
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
 *
 * @param rule ABP snippet rule
 * @returns array of AdGuard scriptlet rules, one or few items depends on Abp-rule
 */
export const convertAbpSnippetToAdg = (rule: string): string[] => {
    const SEMICOLON_DIVIDER = /;(?=(?:(?:[^"]*"){2})*[^"]*$)/g;
    const mask = rule.includes(validator.ABP_SCRIPTLET_MASK)
        ? validator.ABP_SCRIPTLET_MASK
        : validator.ABP_SCRIPTLET_EXCEPTION_MASK;
    const template = mask === validator.ABP_SCRIPTLET_MASK
        ? ADGUARD_SCRIPTLET_TEMPLATE
        : ADGUARD_SCRIPTLET_EXCEPTION_TEMPLATE;
    const domains = substringBefore(rule, mask);
    const args = substringAfter(rule, mask);

    /* eslint-disable @typescript-eslint/no-shadow */
    return args.split(SEMICOLON_DIVIDER)
        // abp-rule may have `;` at the end which makes last array item irrelevant
        // https://github.com/AdguardTeam/Scriptlets/issues/236
        .filter(isExisting)
        .map((args) => getAbpSnippetArguments(args)
            .map((arg, index) => (index === 0 ? `abp-${arg}` : arg))
            .map((arg) => wrapInSingleQuotes(arg))
            .join(`${COMMA_SEPARATOR} `))
        .map((args) => replacePlaceholders(template, { domains, args }));
    /* eslint-enable @typescript-eslint/no-shadow */
};

/**
 * Validates ADG scriptlet rule syntax.
 *
 * IMPORTANT! The method is not very fast as it parses the rule and checks its syntax.
 *
 * @param adgRuleText Single ADG scriptlet rule.
 *
 * @returns False if ADG scriptlet rule syntax is not valid
 * or `adgRuleText` is not an ADG scriptlet rule.
 */
const isValidAdgScriptletRuleSyntax = (adgRuleText: string): boolean => {
    if (!adgRuleText) {
        return false;
    }
    if (!validator.isAdgScriptletRule(adgRuleText)) {
        return false;
    }
    // isAdgScriptletRule() does not check the rule syntax
    let parsedRule;
    try {
        // parseRule() ensures that the rule syntax is valid
        // and it will throw an error if it is not
        parsedRule = parseRule(adgRuleText);
        return validator.isValidScriptletName(parsedRule.name);
    } catch (e) {
        return false;
    }
};

/**
 * Functions to validate if a given string corresponds to a scriptlet rule of a particular origin.
 */
const OriginValidator = {
    [Origin.Ubo]: validator.isUboScriptletRule,
    [Origin.Abp]: validator.isAbpSnippetRule,
    [Origin.AdgValid]: isValidAdgScriptletRuleSyntax,
    [Origin.AdgInvalid]: (r: string) => {
        return validator.isAdgScriptletRule(r) && !isValidAdgScriptletRuleSyntax(r);
    },
} as const;

// Functions to convert a given scriptlet rule from a mapped origin to an AdGuard rule
const Converter = {
    [Origin.Ubo]: convertUboScriptletToAdg,
    [Origin.Abp]: convertAbpSnippetToAdg,
    [Origin.AdgValid]: (r: string) => [r],
    [Origin.AdgInvalid]: (r: string) => {
        // eslint-disable-next-line no-console
        console.log(`Invalid AdGuard scriptlet rule: ${r}`);
        return [];
    },
} as const;

/**
 * Returns rule origin name in a meaningful order.
 *
 * @param rule The rule string to check.
 * @returns Rule origin name or undefined if the rule has no valid origin.
 */
const getRuleOrigin = (rule: string): Origin | undefined => {
    return originNames.find((originName) => OriginValidator[originName](rule));
};

/**
 * Converts any scriptlet rule into AdGuard syntax rule.
 * Comments and non-scriptlet rules are returned without changes.
 *
 * @param rule Rule.
 *
 * @returns Array of AdGuard scriptlet rules: one array item for ADG and UBO or few items for ABP.
 * For the ADG `rule` validates its syntax, and returns an empty array if it is invalid.
 */
export const convertScriptletToAdg = (rule: string): string[] => {
    if (validator.isComment(rule)) {
        return [rule];
    }

    // Determine rule's origin
    const originName = getRuleOrigin(rule);

    // if the origin is unknown, return rule unchanged
    // as it is a non-scriptlet rule
    if (!originName) {
        return [rule];
    }

    // Call converter of given origin
    return Converter[originName](rule);
};

/**
 * Converts AdGuard scriptlet rule to UBO syntax.
 *
 * @param rule AdGuard scriptlet rule
 * @returns UBO scriptlet rule
 * or undefined if `rule` is not valid AdGuard scriptlet rule.
 */
export const convertAdgScriptletToUbo = (rule: string): string | undefined => {
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
        } else {
            preparedParams = parsedParams;
        }

        if (preparedParams && preparedParams.length > 0) {
            // escape all commas in params
            // https://github.com/AdguardTeam/FiltersCompiler/issues/185
            preparedParams = preparedParams.map((param) => {
                if (param.includes(COMMA_SEPARATOR)) {
                    return replaceAll(param, COMMA_SEPARATOR, ESCAPED_COMMA_SEPARATOR);
                }
                return param;
            });
        }

        // object of name and aliases for the Adg-scriptlet
        const scriptletNames = Object.keys(scriptletList);
        const adgScriptletObject = scriptletNames
            .map((name) => (scriptletList as ScriptletstList)[name])
            .map((scriptlet) => {
                const [name, ...aliases] = scriptlet.names;
                return { name, aliases };
            })
            .find((el) => (el.name === parsedName
                || el.aliases.includes(parsedName))) as AdgScriptletObject;

        const { aliases } = adgScriptletObject;

        if (aliases.length > 0) {
            const uboAlias = adgScriptletObject.aliases
                .find((alias) => alias.includes(UBO_ALIAS_NAME_MARKER));

            if (uboAlias) {
                const matchResult = rule.match(ADGUARD_SCRIPTLET_MASK_REG);
                const mask = Array.isArray(matchResult) ? matchResult[0] : null;
                let template;
                if (mask?.includes('@')) {
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
 * Returns scriptlet name from `rule`.
 *
 * @param rule AdGuard syntax scriptlet rule.
 * @returns Scriptlet name or null.
 */
const getAdgScriptletName = (rule: string): string | null => {
    // get substring after '#//scriptlet('
    let buffer = substringAfter(rule, `${ADG_SCRIPTLET_MASK}(`);
    if (!buffer) {
        return null;
    }
    // get the quote used for the first scriptlet parameter which is a name
    const nameQuote = buffer[0];
    // delete the quote from the buffer
    buffer = buffer.slice(1);
    if (!buffer) {
        return null;
    }
    // get a supposed scriptlet name
    const name = substringBefore(buffer, nameQuote);
    return name === buffer
        ? null
        : name;
};

/**
 * 1. For ADG scriptlet checks whether the scriptlet syntax and name are valid.
 * 2. For UBO and ABP scriptlet first checks their compatibility with ADG
 * by converting them into ADG syntax, and after that checks the name.
 *
 * ADG or UBO rules are "single-scriptlet", but ABP rule may contain more than one snippet
 * so if at least one of them is not valid — whole `ruleText` rule is not valid too.
 *
 * @param ruleText Any scriptlet rule — ADG or UBO or ABP.
 *
 * @returns True if scriptlet name is valid in rule.
 */
export const isValidScriptletRule = (ruleText: string): boolean => {
    if (!ruleText) {
        return false;
    }

    // `ruleText` with ABP syntax may contain more than one snippet in one rule
    const rulesArray = convertScriptletToAdg(ruleText);

    // for ADG rule with invalid syntax convertScriptletToAdg() will return empty array
    if (rulesArray.length === 0) {
        return false;
    }

    // checking if each of parsed scriptlets is valid
    // if at least one of them is not valid - whole `ruleText` is not valid too
    const isValid = rulesArray.every((rule) => {
        const name = getAdgScriptletName(rule);
        return name && validator.isValidScriptletName(name);
    });

    return isValid;
};

/**
 * Gets index and redirect resource marker from UBO/ADG modifiers array
 *
 * @param modifiers rule modifiers
 * @param redirectsData validator.REDIRECT_RULE_TYPES.(UBO|ADG)
 * @param rule rule string
 * @returns merker data object
 */
const getMarkerData = (modifiers: string[], redirectsData: RedirectsData, rule: string): MarkerData => {
    const { redirectRuleMarker, redirectMarker } = redirectsData;

    let index: number;
    if (redirectRuleMarker) {
        index = modifiers.findIndex((m) => m.includes(redirectRuleMarker));
        if (index > -1) {
            return { index, marker: redirectRuleMarker };
        }
    }

    index = modifiers.findIndex((m) => m.includes(redirectMarker));
    if (index > -1) {
        return { index, marker: redirectMarker };
    }

    throw new Error(`No redirect resource modifier found in rule: ${rule}`);
};

/**
 * Converts Ubo redirect rule to Adg one
 *
 * @param rule ubo redirect rule
 * @returns  converted adg rule
 */
export const convertUboRedirectToAdg = (rule: string): string => {
    const firstPartOfRule = substringBefore(rule, '$');
    const uboModifiers = validator.parseModifiers(rule);
    const uboMarkerData = getMarkerData(uboModifiers, validator.REDIRECT_RULE_TYPES.UBO, rule);

    const adgModifiers = uboModifiers
        .map((modifier, index) => {
            if (index === uboMarkerData.index) {
                const uboName = validator.getRedirectName([modifier], uboMarkerData.marker);
                if (uboName) {
                    const adgName = validator.REDIRECT_RULE_TYPES.UBO.compatibility[uboName];
                    const adgMarker = uboMarkerData.marker === validator.ADG_UBO_REDIRECT_RULE_MARKER
                        ? validator.REDIRECT_RULE_TYPES.ADG.redirectRuleMarker
                        : validator.REDIRECT_RULE_TYPES.ADG.redirectMarker;
                    return `${adgMarker}${adgName}`;
                }
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
 *
 * @param rule abp redirect rule
 * @returns converted adg rule
 */
export const convertAbpRedirectToAdg = (rule: string): string => {
    const firstPartOfRule = substringBefore(rule, '$');
    const abpModifiers = validator.parseModifiers(rule);
    const adgModifiers = abpModifiers
        .map((modifier) => {
            if (modifier.includes(validator.REDIRECT_RULE_TYPES.ABP.redirectMarker)) {
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
 *
 * @param {string} rule redirect rule
 * @returns converted adg rule
 */
export const convertRedirectToAdg = (rule: string): string | undefined => {
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
 *
 * Note: if adg redirect uses UBO's priority syntax, it will be lost on conversion, e.g:
 * ||example.com$redirect=noopjs:99 => ||example.com$redirect=noop.js
 *
 * @param rule adg rule
 * @returns converted ubo rule
 * @throws on incompatible rule
 */
export const convertAdgRedirectToUbo = (rule: string): string => {
    if (!validator.isAdgRedirectCompatibleWithUbo(rule)) {
        throw new Error(`Unable to convert for uBO - unsupported redirect in rule: ${rule}`);
    }

    const basePart = substringBefore(rule, '$');
    const adgModifiers = validator.parseModifiers(rule);

    const adgMarkerData = getMarkerData(adgModifiers, validator.REDIRECT_RULE_TYPES.ADG, rule);

    const adgRedirectName = validator.getRedirectName(adgModifiers, adgMarkerData.marker);

    if (!adgRedirectName) {
        throw new Error(`Unable to convert for uBO - no valid redirect name in rule: ${rule}`);
    }

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

/**
 * Converts a redirect name to ADG compatible one, if possible
 *
 * @param name Redirect name to convert
 * @returns Converted ADG compatible redirect name or `undefined` if the redirect isn't supported
 */
export const convertRedirectNameToAdg = (name: string): string | undefined => {
    let nameToCheck = name.trim();

    // Check if the redirect is already ADG compatible
    if (validator.REDIRECT_RULE_TYPES.ADG.compatibility[nameToCheck]) {
        return nameToCheck;
    }

    // Convert uBO redirects to ADG
    if (validator.REDIRECT_RULE_TYPES.UBO.compatibility[nameToCheck]) {
        return validator.REDIRECT_RULE_TYPES.UBO.compatibility[nameToCheck];
    }

    // Convert ABP redirects to ADG
    // AGTree parses '$rewrite=abp-resource:blank-js' as 'rewrite' modifier with
    // 'abp-resource:blank-js' value. So at this point we have to check if the
    // redirect name starts with 'abp-resource:' and remove it if it does.
    if (nameToCheck.startsWith(ABP_RESOURCE_MARKER)) {
        nameToCheck = nameToCheck.slice(ABP_RESOURCE_MARKER.length).trim();
    }

    // This also returns `undefined` if the redirect isn't supported
    return validator.REDIRECT_RULE_TYPES.ABP.compatibility[nameToCheck];
};
