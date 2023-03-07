import {
    startsWith,
    endsWith,
    substringAfter,
    toRegExp,
} from './string-utils';

import { getObjectFromEntries } from './object-utils';

import { ADG_SCRIPTLET_MASK } from './parse-rule';

import * as scriptletsList from '../scriptlets/scriptlets-list';

import redirects from './compatibility-redirects';

const JS_RULE_MARKER = '#%#';
const COMMENT_MARKER = '!';

/**
 * Checks if rule text is comment e.g. !!example.org##+js(set-constant.js, test, false)
 *
 * @param {string} rule rule text
 * @returns {boolean} if rule text is comment
 */
const isComment = (rule) => startsWith(rule, COMMENT_MARKER);

/* ************************************************************************
 *
 * Scriptlets
 *
 ************************************************************************** */

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
 * Checks if the `rule` is AdGuard scriptlet rule
 *
 * @param {string} rule - rule text
 * @returns {boolean} if given rule is adg rule
 */
const isAdgScriptletRule = (rule) => {
    return (
        !isComment(rule)
        && rule.indexOf(ADG_SCRIPTLET_MASK) > -1
    );
};

/**
 * Checks if the `rule` is uBO scriptlet rule
 *
 * @param {string} rule rule text
 * @returns {boolean} if given rule is ubo rule
 */
const isUboScriptletRule = (rule) => {
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
 * Checks if the `rule` is AdBlock Plus snippet
 *
 * @param {string} rule rule text
 * @returns {boolean} if given rule is abp rule
 */
const isAbpSnippetRule = (rule) => {
    return (
        rule.indexOf(ABP_SCRIPTLET_MASK) > -1
        || rule.indexOf(ABP_SCRIPTLET_EXCEPTION_MASK) > -1
    )
    && rule.search(ADG_CSS_MASK_REG) === -1
    && !isComment(rule);
};

/**
 * Returns array of scriptlet objects.
 * Needed for scriptlet name validation which will check aliases names.
 *
 * @returns {Array<Object>} Array of all scriptlet objects.
 */
const getScriptletsListObj = () => {
    return Object.keys(scriptletsList).map((key) => scriptletsList[key]);
};

/**
 * Finds scriptlet by the `name`.
 *
 * @param {string} name Scriptlet name.
 * @param {Array<Object>} scriptlets Array of all scriptlet objects.
 * @returns {Function} Scriptlet function.
 */
const getScriptletByName = (name, scriptlets) => {
    if (!scriptlets) {
        scriptlets = getScriptletsListObj();
    }
    return scriptlets
        .find((s) => {
            return s.names
                // full match name checking
                && (s.names.indexOf(name) > -1
                    // or check ubo alias name without '.js' at the end
                    || (!endsWith(name, '.js') && s.names.indexOf(`${name}.js`) > -1)
                );
        });
};

const scriptletObjects = getScriptletsListObj();

/**
 * Checks whether the scriptlet `name` is valid by checking the scriptlet list object.
 *
 * @param {string} name Scriptlet name.
 * @returns {boolean} True if scriptlet name is valid.
 */
const isValidScriptletNameNotCached = (name) => {
    if (!name) {
        return false;
    }
    const scriptlet = getScriptletByName(name, scriptletObjects);
    if (!scriptlet) {
        return false;
    }
    return true;
};

/**
 * Cache for better performance of scriptlet name validation.
 */
const scriptletNameValidationCache = new Map();

/**
 * Checks if the scriptlet name is valid.
 * Uses cache for better performance.
 *
 * @param {string} name Scriptlet name.
 * @returns {boolean} True if scriptlet name is valid.
 */
const isValidScriptletName = (name) => {
    if (!name) {
        return false;
    }
    // if there is no cached validation value
    if (!scriptletNameValidationCache.has(name)) {
        // we should calculate it first
        const isValid = isValidScriptletNameNotCached(name);
        // and save it to the cache then
        scriptletNameValidationCache.set(name, isValid);
        return isValid;
    }
    // otherwise return cached validation result
    return scriptletNameValidationCache.get(name);
};

/* ************************************************************************
 *
 * Redirects
 *
 ************************************************************************** */

/**
 * Redirect resources markers
 */
const ADG_UBO_REDIRECT_MARKER = 'redirect=';
const ADG_UBO_REDIRECT_RULE_MARKER = 'redirect-rule=';
const ABP_REDIRECT_MARKER = 'rewrite=abp-resource:';
const EMPTY_REDIRECT_MARKER = 'empty';

const VALID_SOURCE_TYPES = [
    'image',
    'media',
    'subdocument',
    'stylesheet',
    'script',
    'xmlhttprequest',
    'other',
];

/**
 * Source types for redirect rules if there is no one of them.
 * Used for ADG -> UBO conversion.
 */
const ABSENT_SOURCE_TYPE_REPLACEMENT = [
    {
        NAME: 'nooptext',
        TYPES: VALID_SOURCE_TYPES,
    },
    {
        NAME: 'noopcss',
        TYPES: ['stylesheet'],
    },
    {
        NAME: 'noopjs',
        TYPES: ['script'],
    },
    {
        NAME: 'noopframe',
        TYPES: ['subdocument'],
    },
    {
        NAME: '1x1-transparent.gif',
        TYPES: ['image'],
    },
    {
        NAME: 'noopmp3-0.1s',
        TYPES: ['media'],
    },
    {
        NAME: 'noopmp4-1s',
        TYPES: ['media'],
    },
    {
        NAME: 'googlesyndication-adsbygoogle',
        TYPES: ['xmlhttprequest', 'script'],
    },
    {
        NAME: 'google-analytics',
        TYPES: ['script'],
    },
    {
        NAME: 'googletagservices-gpt',
        TYPES: ['script'],
    },
];

const validAdgRedirects = redirects.filter((el) => el.adg);

/**
 * Compatibility object where KEYS = UBO redirect names and VALUES = ADG redirect names
 * It's used for UBO -> ADG converting
 */
const uboToAdgCompatibility = getObjectFromEntries(
    validAdgRedirects
        .filter((el) => el.ubo)
        .map((el) => {
            return [el.ubo, el.adg];
        }),
);

/**
 * Compatibility object where KEYS = ABP redirect names and VALUES = ADG redirect names
 * It's used for ABP -> ADG converting
 */
const abpToAdgCompatibility = getObjectFromEntries(
    validAdgRedirects
        .filter((el) => el.abp)
        .map((el) => {
            return [el.abp, el.adg];
        }),
);

/**
 * Compatibility object where KEYS = UBO redirect names and VALUES = ADG redirect names
 * It's used for ADG -> UBO converting
 */
const adgToUboCompatibility = getObjectFromEntries(
    validAdgRedirects
        .filter((el) => el.ubo)
        .map((el) => {
            return [el.adg, el.ubo];
        }),
);

/**
 * Needed for AdGuard redirect names validation where KEYS = **valid** AdGuard redirect names
 * 'adgToUboCompatibility' is still needed for ADG -> UBO converting
 */
const validAdgCompatibility = getObjectFromEntries(
    validAdgRedirects
        .map((el) => {
            return [el.adg, 'valid adg redirect'];
        }),
);

const REDIRECT_RULE_TYPES = {
    VALID_ADG: {
        redirectMarker: ADG_UBO_REDIRECT_MARKER,
        redirectRuleMarker: ADG_UBO_REDIRECT_RULE_MARKER,
        compatibility: validAdgCompatibility,
    },
    ADG: {
        redirectMarker: ADG_UBO_REDIRECT_MARKER,
        redirectRuleMarker: ADG_UBO_REDIRECT_RULE_MARKER,
        compatibility: adgToUboCompatibility,
    },
    UBO: {
        redirectMarker: ADG_UBO_REDIRECT_MARKER,
        redirectRuleMarker: ADG_UBO_REDIRECT_RULE_MARKER,
        compatibility: uboToAdgCompatibility,
    },
    ABP: {
        redirectMarker: ABP_REDIRECT_MARKER,
        compatibility: abpToAdgCompatibility,
    },
};

/**
 * Parses redirect rule modifiers
 *
 * @param {string} rule rule text
 * @returns {Array} list of rule modifiers
 */
const parseModifiers = (rule) => substringAfter(rule, '$').split(',');

/**
 * Gets redirect resource name
 *
 * @param {string} rule rule text
 * @param {string} marker - specific Adg/Ubo or Abp redirect resources marker
 * @returns {string} - redirect resource name
 */
const getRedirectName = (rule, marker) => {
    const ruleModifiers = parseModifiers(rule);
    const redirectNamePart = ruleModifiers
        .find((el) => el.includes(marker));
    return substringAfter(redirectNamePart, marker);
};

/**
 * Checks if the `rule` is AdGuard redirect rule.
 * Discards comments and JS rules and checks if the `rule` has 'redirect' modifier.
 *
 * @param {string} rule - rule text
 * @returns {boolean} if given rule is adg redirect
 */
const isAdgRedirectRule = (rule) => {
    const MARKER_IN_BASE_PART_MASK = '/((?!\\$|\\,).{1})redirect((-rule)?)=(.{0,}?)\\$(popup)?/';
    return (
        !isComment(rule)
        && (rule.includes(REDIRECT_RULE_TYPES.ADG.redirectMarker)
            || rule.includes(REDIRECT_RULE_TYPES.ADG.redirectRuleMarker))
        // some js rules may have 'redirect=' in it, so we should get rid of them
        && !rule.includes(JS_RULE_MARKER)
        // get rid of rules like '_redirect=*://look.$popup'
        && !(toRegExp(MARKER_IN_BASE_PART_MASK).test(rule))
    );
};

// const getRedirectResourceMarkerData = ()

/**
 * Checks if the `rule` satisfies the `type`
 *
 * @param {string} rule - rule text
 * @param {'VALID_ADG'|'ADG'|'UBO'|'ABP'} type - type of a redirect rule
 * @returns {boolean} if the `rule` satisfies the `type`
 */
const isRedirectRuleByType = (rule, type) => {
    const {
        redirectMarker,
        redirectRuleMarker,
        compatibility,
    } = REDIRECT_RULE_TYPES[type];

    if (rule && !isComment(rule)) {
        let marker;
        // check if there is a $redirect-rule modifier in rule
        let markerIndex = redirectRuleMarker ? rule.indexOf(redirectRuleMarker) : -1;
        if (markerIndex > -1) {
            marker = redirectRuleMarker;
        } else {
            // check if there $redirect modifier in rule
            markerIndex = rule.indexOf(redirectMarker);
            if (markerIndex > -1) {
                marker = redirectMarker;
            } else {
                return false;
            }
        }

        const redirectName = getRedirectName(rule, marker);

        if (!redirectName) {
            return false;
        }

        return redirectName === Object
            .keys(compatibility)
            .find((el) => el === redirectName);
    }
    return false;
};

/**
 * Checks if the `rule` is **valid** AdGuard redirect resource rule
 *
 * @param {string} rule - rule text
 * @returns {boolean} if given rule is valid adg redirect
 */
const isValidAdgRedirectRule = (rule) => {
    return isRedirectRuleByType(rule, 'VALID_ADG');
};

/**
 * Checks if the AdGuard redirect `rule` has Ubo analog. Needed for Adg->Ubo conversion
 *
 * @param {string} rule - AdGuard rule text
 * @returns {boolean} - true if the rule can be converted to Ubo
 */
const isAdgRedirectCompatibleWithUbo = (rule) => {
    return isAdgRedirectRule(rule) && isRedirectRuleByType(rule, 'ADG');
};

/**
 * Checks if the Ubo redirect `rule` has AdGuard analog. Needed for Ubo->Adg conversion
 *
 * @param {string} rule - Ubo rule text
 * @returns {boolean} - true if the rule can be converted to AdGuard
 */
const isUboRedirectCompatibleWithAdg = (rule) => {
    return isRedirectRuleByType(rule, 'UBO');
};

/**
 * Checks if the Abp redirect `rule` has AdGuard analog. Needed for Abp->Adg conversion
 *
 * @param {string} rule - Abp rule text
 * @returns {boolean} - true if the rule can be converted to AdGuard
 */
const isAbpRedirectCompatibleWithAdg = (rule) => {
    return isRedirectRuleByType(rule, 'ABP');
};

/**
 * Checks if the rule has specified content type before Adg -> Ubo conversion.
 *
 * Used ONLY for Adg -> Ubo conversion
 * because Ubo redirect rules must contain content type, but Adg and Abp must not.
 *
 * Also source type can not be added automatically because of such valid rules:
 * ! Abp:
 * $rewrite=abp-resource:blank-js,xmlhttprequest
 * ! Adg:
 * $script,redirect=noopvast-2.0
 * $xmlhttprequest,redirect=noopvast-2.0
 *
 * @param {string} rule rule text
 * @returns {boolean} if the rule has specified content type before conversion
 */
const hasValidContentType = (rule) => {
    const ruleModifiers = parseModifiers(rule);
    // rule can have more than one source type modifier
    const sourceTypes = ruleModifiers
        .filter((el) => VALID_SOURCE_TYPES.includes(el));

    const isSourceTypeSpecified = sourceTypes.length > 0;
    const isEmptyRedirect = ruleModifiers.includes(`${ADG_UBO_REDIRECT_MARKER}${EMPTY_REDIRECT_MARKER}`)
        || ruleModifiers.includes(`${ADG_UBO_REDIRECT_RULE_MARKER}${EMPTY_REDIRECT_MARKER}`);

    if (isEmptyRedirect) {
        // no source type for 'empty' is allowed
        return true;
    }

    return isSourceTypeSpecified;
};

const validator = {
    UBO_SCRIPTLET_MASK_REG,
    ABP_SCRIPTLET_MASK,
    ABP_SCRIPTLET_EXCEPTION_MASK,
    isComment,
    isAdgScriptletRule,
    isUboScriptletRule,
    isAbpSnippetRule,
    getScriptletByName,
    isValidScriptletName,
    ADG_UBO_REDIRECT_RULE_MARKER,
    REDIRECT_RULE_TYPES,
    ABSENT_SOURCE_TYPE_REPLACEMENT,
    isAdgRedirectRule,
    isValidAdgRedirectRule,
    isAdgRedirectCompatibleWithUbo,
    isUboRedirectCompatibleWithAdg,
    isAbpRedirectCompatibleWithAdg,
    parseModifiers,
    getRedirectName,
    hasValidContentType,
};

export default validator;
