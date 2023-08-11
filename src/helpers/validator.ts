import {
    substringAfter,
    toRegExp,
} from './string-utils';
import { ADG_SCRIPTLET_MASK } from './parse-rule';
import * as scriptletsList from '../scriptlets/scriptlets-list';
import redirects from './compatibility-redirects';

interface UboToAdgCompatibilityObject extends RedirectCompatibilityMap {
    ubo: string;
}

interface AbpToAdgCompatibilityObject extends RedirectCompatibilityMap {
    abp: string;
}

const JS_RULE_MARKER = '#%#';
const COMMENT_MARKER = '!';
const UBO_REDIRECT_PRIORITY_MARKER = ':';

/**
 * Checks if rule text is comment e.g. !!example.org##+js(set-constant.js, test, false)
 *
 * @param rule rule text
 * @returns if rule text is comment
 */
const isComment = (rule: string) => rule.startsWith(COMMENT_MARKER);

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
 * @param rule - rule text
 * @returns true if given rule is adg rule
 */
const isAdgScriptletRule = (rule: string): boolean => !isComment(rule) && rule.includes(ADG_SCRIPTLET_MASK);

/**
 * Checks if the `rule` is uBO scriptlet rule
 *
 * @param rule rule text
 * @returns true if given rule is ubo rule
 */
const isUboScriptletRule = (rule: string): boolean => {
    return (
        rule.includes(UBO_SCRIPTLET_MASK_1)
        || rule.includes(UBO_SCRIPTLET_MASK_2)
        || rule.includes(UBO_SCRIPTLET_EXCEPTION_MASK_1)
        || rule.includes(UBO_SCRIPTLET_EXCEPTION_MASK_2)
    )
        && UBO_SCRIPTLET_MASK_REG.test(rule)
        && !isComment(rule);
};

/**
 * Checks if the `rule` is AdBlock Plus snippet
 *
 * @param rule rule text
 * @returns true if given rule is abp rule
 */
const isAbpSnippetRule = (rule: string): boolean => {
    return (
        rule.includes(ABP_SCRIPTLET_MASK)
        || rule.includes(ABP_SCRIPTLET_EXCEPTION_MASK)
    )
    && rule.search(ADG_CSS_MASK_REG) === -1
    && !isComment(rule);
};

/**
 * Returns array of scriptlet objects.
 * Needed for scriptlet name validation which will check aliases names.
 *
 * @returns Array of all scriptlet objects.
 */
const getScriptletsObjList = () => {
    return Object.values(scriptletsList as ScriptletstList);
};

/**
 * Finds scriptlet by the `name`.
 *
 * @param name Scriptlet name.
 * @param scriptlets Array of all scriptlet objects.
 * @returns {Function} Scriptlet function.
 */
const getScriptletByName = (name: string, scriptlets: Scriptlet[]): Scriptlet | undefined => {
    if (!scriptlets) {
        scriptlets = getScriptletsObjList();
    }
    return scriptlets
        .find((s) => {
            return s.names
                // full match name checking
                && (s.names.includes(name)
                    // or check ubo alias name without '.js' at the end
                    || (!name.endsWith('.js') && s.names.includes(`${name}.js`))
                );
        });
};

const scriptletObjects = getScriptletsObjList();

/**
 * Checks whether the scriptlet `name` is valid by checking the scriptlet list object.
 *
 * @param name Scriptlet name.
 * @returns True if scriptlet name is valid.
 */
const isValidScriptletNameNotCached = (name: string): boolean => {
    if (!name) {
        return false;
    }
    return !!getScriptletByName(name, scriptletObjects);
};

/**
 * Cache for better performance of scriptlet name validation.
 */
const scriptletNameValidationCache = new Map();

/**
 * Checks whether the `name` is valid scriptlet name.
 * Uses cache for better performance.
 *
 * @param name Scriptlet name.
 * @returns true if scriptlet name is a valid one.
 */
const isValidScriptletName = (name: string): boolean => {
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

const validAdgRedirects = redirects.filter((el): el is RedirectCompatibilityMap => !!el.adg);

/**
 * Compatibility object where KEYS = UBO redirect names and VALUES = ADG redirect names
 * It's used for UBO -> ADG converting
 */
const uboToAdgCompatibility = Object.fromEntries(
    validAdgRedirects
        .filter((el): el is UboToAdgCompatibilityObject => !!el.ubo)
        .map((el): [string, string] => {
            return [el.ubo, el.adg];
        }),
);

/**
 * Compatibility object where KEYS = ABP redirect names and VALUES = ADG redirect names
 * It's used for ABP -> ADG converting
 */
const abpToAdgCompatibility = Object.fromEntries(
    validAdgRedirects
        .filter((el): el is AbpToAdgCompatibilityObject => !!el.abp)
        .map((el): [string, string] => {
            return [el.abp, el.adg];
        }),
);

/**
 * Compatibility object where KEYS = UBO redirect names and VALUES = ADG redirect names
 * It's used for ADG -> UBO converting
 */
const adgToUboCompatibility = Object.fromEntries(
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
const validAdgCompatibility = Object.fromEntries(
    validAdgRedirects
        .map((el) => {
            return [el.adg, 'valid adg redirect'];
        }),
);

enum RedirectRuleType {
    ValidAdg = 'VALID_ADG',
    Adg = 'ADG',
    Ubo = 'UBO',
    Abp = 'ABP',
}

const REDIRECT_RULE_TYPES: Record<RedirectRuleType, RedirectsData> = {
    [RedirectRuleType.ValidAdg]: {
        redirectMarker: ADG_UBO_REDIRECT_MARKER,
        compatibility: validAdgCompatibility,
        redirectRuleMarker: ADG_UBO_REDIRECT_RULE_MARKER,
    },
    [RedirectRuleType.Adg]: {
        redirectMarker: ADG_UBO_REDIRECT_MARKER,
        compatibility: adgToUboCompatibility,
        redirectRuleMarker: ADG_UBO_REDIRECT_RULE_MARKER,
    },
    [RedirectRuleType.Ubo]: {
        redirectMarker: ADG_UBO_REDIRECT_MARKER,
        compatibility: uboToAdgCompatibility,
        redirectRuleMarker: ADG_UBO_REDIRECT_RULE_MARKER,
    },
    [RedirectRuleType.Abp]: {
        redirectMarker: ABP_REDIRECT_MARKER,
        compatibility: abpToAdgCompatibility,
    },
};

/**
 * Parses redirect rule modifiers
 *
 * @param rule rule text
 * @returns list of rule modifiers
 */
const parseModifiers = (rule: string): string[] => substringAfter(rule, '$').split(',');

/**
 * Gets redirect resource name
 *
 * @param ruleModifiers - list of rule modifiers
 * @param marker - specific Adg/Ubo or Abp redirect resources marker
 * @returns - redirect resource name
 */
const getRedirectName = (ruleModifiers: string[], marker: string): string | null => {
    const redirectNamePart = ruleModifiers
        .find((el) => el.includes(marker));

    if (!redirectNamePart) {
        return null;
    }

    let redirectName = substringAfter(redirectNamePart, marker);

    /**
     * Ignore UBO's redirect rule priority
     * e.g remove ':100' from ||example.com$redirect=noopjs:100
     * https://github.com/AdguardTeam/tsurlfilter/issues/59
     */
    const redirectPriorityIndex = redirectName.indexOf(UBO_REDIRECT_PRIORITY_MARKER);
    if (redirectPriorityIndex > -1) {
        redirectName = redirectName.substring(0, redirectPriorityIndex);
    }

    return redirectName;
};

/**
 * Checks if the `rule` is AdGuard redirect rule.
 * Discards comments and JS rules and checks if the `rule` has 'redirect' modifier.
 *
 * @param rule - rule text
 * @returns true if given rule is adg redirect
 */
const isAdgRedirectRule = (rule: string): boolean => {
    const MARKER_IN_BASE_PART_MASK = '/((?!\\$|\\,).{1})redirect((-rule)?)=(.{0,}?)\\$(popup)?/';
    const { redirectMarker, redirectRuleMarker } = REDIRECT_RULE_TYPES[RedirectRuleType.Adg];

    return (
        !isComment(rule)
        && (rule.includes(redirectMarker)
            || (typeof redirectRuleMarker === 'string' && rule.includes(redirectRuleMarker)))
        // some js rules may have 'redirect=' in it, so we should get rid of them
        && !rule.includes(JS_RULE_MARKER)
        // get rid of rules like '_redirect=*://look.$popup'
        && !(toRegExp(MARKER_IN_BASE_PART_MASK).test(rule))
    );
};

/**
 * Checks if the `rule` satisfies the `type`
 *
 * @param rule - rule text
 * @param type - type of a redirect rule
 * @returns if the `rule` satisfies the `type`
 */
const isRedirectRuleByType = (rule: string, type: RedirectRuleType): boolean => {
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

        if (!marker) {
            return false;
        }

        const redirectName = getRedirectName(
            parseModifiers(rule),
            marker,
        );

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
 * @param rule - rule text
 * @returns true if given rule is valid adg redirect
 */
const isValidAdgRedirectRule = (rule: string): boolean => {
    return isRedirectRuleByType(rule, RedirectRuleType.ValidAdg);
};

/**
 * Checks if the AdGuard redirect `rule` has Ubo analog. Needed for Adg->Ubo conversion
 *
 * @param rule - AdGuard rule text
 * @returns - true if the rule can be converted to Ubo
 */
const isAdgRedirectCompatibleWithUbo = (rule: string): boolean => {
    return isAdgRedirectRule(rule) && isRedirectRuleByType(rule, RedirectRuleType.Adg);
};

/**
 * Checks if the Ubo redirect `rule` has AdGuard analog. Needed for Ubo->Adg conversion
 *
 * @param rule - Ubo rule text
 * @returns - true if the rule can be converted to AdGuard
 */
const isUboRedirectCompatibleWithAdg = (rule: string): boolean => {
    return isRedirectRuleByType(rule, RedirectRuleType.Ubo);
};

/**
 * Checks if the Abp redirect `rule` has AdGuard analog. Needed for Abp->Adg conversion
 *
 * @param rule - Abp rule text
 * @returns - true if the rule can be converted to AdGuard
 */
const isAbpRedirectCompatibleWithAdg = (rule: string): boolean => {
    return isRedirectRuleByType(rule, RedirectRuleType.Abp);
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
 * @param rule rule text
 * @returns if the rule has specified content type before conversion
 */
const hasValidContentType = (rule: string): boolean => {
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
    isRedirectRuleByType,
    RedirectRuleType,
};

export default validator;
