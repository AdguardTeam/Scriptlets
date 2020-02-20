import {
    startsWith,
    substringAfter,
} from './string-utils';

import { ADG_SCRIPTLET_MASK } from './parse-rule';

import * as compatibilityTable from '../../scripts/compatibility-table.json';


const COMMENT_MARKER = '!';

/**
 * Checks if rule text is comment e.g. !!example.org##+js(set-constant.js, test, false)
 * @param {string} rule
 * @return {boolean}
 */
export const isComment = (rule) => startsWith(rule, COMMENT_MARKER);


/* ************************************************************************
 *
 * Scriptlets
 *
 ************************************************************************** */


/**
 * uBlock scriptlet rule mask
 */
export const UBO_SCRIPTLET_MASK_REG = /#@?#script:inject|#@?#\s*\+js/;
const UBO_SCRIPTLET_MASK_1 = '##+js';
const UBO_SCRIPTLET_MASK_2 = '##script:inject';
const UBO_SCRIPTLET_EXCEPTION_MASK_1 = '#@#+js';
const UBO_SCRIPTLET_EXCEPTION_MASK_2 = '#@#script:inject';

/**
 * AdBlock Plus snippet rule mask
 */
export const ABP_SCRIPTLET_MASK = '#$#';
export const ABP_SCRIPTLET_EXCEPTION_MASK = '#@$#';

/**
 * AdGuard CSS rule mask
 */
const ADG_CSS_MASK_REG = /#@?\$#.+?\s*\{.*\}\s*$/g;


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

/* ************************************************************************
 *
 * Redirects
 *
 ************************************************************************** */

/**
 * Redirect resources markers
 */
export const ADG_UBO_REDIRECT_RESOURCE_MARKER = 'redirect=';
export const ABP_REDIRECT_RESOURCE_MARKER = 'rewrite=abp-resource:';

const VALID_SOURCE_TYPES = [
    'image',
    'subdocument',
    'stylesheet',
    'script',
    'xmlhttprequest',
    'media',
];

const validAdgRedirects = compatibilityTable.redirects.filter((el) => (el.adg));

/**
 * Converts array of pairs to object.
 * Sort of Object.fromEntries() polyfill.
 * @param {Array} pairs - array of pairs
 * @returns {Object}
 */
const arrayOfPairsToObject = (pairs) => {
    const output = pairs
        .reduce((acc, el) => {
            const [key, value] = el;
            acc[key] = value;
            return acc;
        }, {});
    return output;
};

/**
 * Compatibility object where KEYS = UBO redirect names and VALUES = ADG redirect names
 * It's used for UBO -> ADG  converting
 */
export const uboToAdgCompatibility = arrayOfPairsToObject(
    validAdgRedirects
        .filter(((el) => (el.ubo)))
        .map((el) => {
            return [el.ubo, el.adg];
        }),
);

/**
 * Compatibility object where KEYS = ABP redirect names and VALUES = ADG redirect names
 * It's used for ABP -> ADG  converting
 */
export const abpToAdgCompatibility = arrayOfPairsToObject(
    validAdgRedirects
        .filter((el) => (el.abp))
        .map((el) => {
            return [el.abp, el.adg];
        }),
);

/**
 * Compatibility object where KEYS = UBO redirect names and VALUES = ADG redirect names
 * It's used for ADG -> UBO  converting
 */
export const adgToUboCompatibility = validAdgRedirects
    .filter((el) => (el.ubo))
    .map((el) => {
        return [el.adg, el.ubo];
    })
    .reduce((acc, el) => {
        const [key, value] = el;
        acc[key] = value;
        return acc;
    }, {});

/**
 * Parse redirect rule modifiers
 * @param {String} rule
 * @returns {Array}
 */
export const parseModifiers = (rule) => (substringAfter(rule, '$').split(','));

/**
 * Gets redirect resource name
 * @param {string} rule
 * @param {string} marker - specific Adg/Ubo or Abp redirect resources marker
 * @returns {string} - redirect resource name
 */
export const getRedirectName = (rule, marker) => {
    const ruleModifiers = parseModifiers(rule);
    const redirectNamePart = ruleModifiers
        .find((el) => (el.indexOf(marker) > -1));
    return substringAfter(redirectNamePart, marker);
};

/**
 * Checks is ADG redirect resource rule
 * @param {string} rule rule text
 */
export const isAdgRedirectResourceRule = (rule) => {
    if ((!isComment(rule))
        && (rule.indexOf('||') > -1)
        && (rule.indexOf(ADG_UBO_REDIRECT_RESOURCE_MARKER) > -1)) {
        const redirectName = getRedirectName(rule, ADG_UBO_REDIRECT_RESOURCE_MARKER);

        return redirectName === Object
            .keys(adgToUboCompatibility)
            .find((el) => (el === redirectName));
    }
    return false;
};

/**
 * Checks is UBO redirect resource rule
 * @param {string} rule rule text
 */
export const isUboRedirectResourceRule = (rule) => {
    if ((!isComment(rule))
        && (rule.indexOf('||') > -1)
        && (rule.indexOf(ADG_UBO_REDIRECT_RESOURCE_MARKER) > -1)) {
        const redirectName = getRedirectName(rule, ADG_UBO_REDIRECT_RESOURCE_MARKER);

        return redirectName === Object
            .keys(uboToAdgCompatibility)
            .find((el) => (el === redirectName));
    }
    return false;
};

/**
 * Checks is ABP rewrite resource rule
 * @param {string} rule rule text
 */
export const isAbpRewriteResourceRule = (rule) => {
    if ((!isComment(rule))
        && (rule.indexOf('||') > -1)
        && (rule.indexOf(ABP_REDIRECT_RESOURCE_MARKER) > -1)) {
        const redirectName = getRedirectName(rule, ABP_REDIRECT_RESOURCE_MARKER);

        return redirectName === Object
            .keys(abpToAdgCompatibility)
            .find((el) => (el === redirectName));
    }
    return false;
};

/**
 * Validates rule for Adg -> Ubo convertation
 *
 * Used ONLY for Adg -> Ubo convertation
 * because Ubo redirect rules must contain source type, but Adg and Abp must not.
 *
 * Also source type can not be added automatically because of such valid rules
 * ! Abp:
 * $rewrite=abp-resource:blank-js,xmlhttprequest
 * ! Adg:
 * $script,redirect=noopvast-2.0
 * $xmlhttprequest,redirect=noopvast-2.0
 *
 * @param {string} rule
 * @returns {boolean}
 */
export const isValidRedirectRule = (rule) => {
    if (isAdgRedirectResourceRule(rule)) {
        const ruleModifiers = parseModifiers(rule);
        const sourceType = ruleModifiers
            .find((el) => (VALID_SOURCE_TYPES.indexOf(el) > -1));

        return sourceType !== undefined;
    }
    return false;
};
