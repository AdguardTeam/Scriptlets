import {
    attachDependencies,
    addCall,
    passSourceAndProps,
} from '../helpers/injector';

import validator from '../helpers/validator';

import {
    convertUboRedirectToAdg,
    convertAbpRedirectToAdg,
    convertRedirectToAdg,
    convertAdgRedirectToUbo,
} from '../helpers/converter';

import * as redirectsList from './redirectsList';

/**
 * Finds redirect resource by it's name
 * @param {string} name - redirect name
 */
const getRedirectByName = (name) => {
    const redirects = Object.keys(redirectsList).map((key) => redirectsList[key]);
    return redirects.find((r) => r.names && r.names.indexOf(name) > -1);
};

const getRedirectCode = (name) => {
    const redirect = getRedirectByName(name);
    let result = attachDependencies(redirect);
    result = addCall(redirect, result);

    return passSourceAndProps({ name }, result);
};

/**
* Checks if the `rule` is AdGuard redirect resource rule
* @param {string} rule - rule text
* @returns {boolean}
*/
const isAdgRedirectRule = (rule) => {
    return validator.isRedirectRule(rule, 'ADG');
};

/**
* Checks if the `rule` is Ubo redirect resource rule
* @param {string} rule - rule text
* @returns {boolean}
*/
const isUboRedirectRule = (rule) => {
    return validator.isRedirectRule(rule, 'UBO');
};

/**
* Checks if the `rule` is Abp redirect resource rule
* @param {string} rule - rule text
* @returns {boolean}
*/
const isAbpRedirectRule = (rule) => {
    return validator.isRedirectRule(rule, 'ABP');
};

export const redirectsCjs = {
    getCode: getRedirectCode,
    isAdgRedirectRule,
    isUboRedirectRule,
    isAbpRedirectRule,
    convertUboRedirectToAdg,
    convertAbpRedirectToAdg,
    convertRedirectToAdg,
    isValidRedirectRule: validator.isValidRedirectRule,
    convertAdgRedirectToUbo,
};
