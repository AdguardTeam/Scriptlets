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

const getRedirectCode = (source) => {
    const redirect = getRedirectByName(source.name);
    let result = attachDependencies(redirect);
    result = addCall(redirect, result);
    result = passSourceAndProps(source, result);

    return result;
};


export const redirectsCjs = {
    getCode: getRedirectCode,
    isAdgRedirectRule: validator.isAdgRedirectRule,
    isValidRedirectRule: validator.isValidRedirectRule,
    isValidAdgRedirectRule: validator.isValidAdgRedirectRule,
    isValidUboRedirectRule: validator.isValidUboRedirectRule,
    isValidAbpRedirectRule: validator.isValidAbpRedirectRule,
    convertUboRedirectToAdg,
    convertAbpRedirectToAdg,
    convertRedirectToAdg,
    convertAdgRedirectToUbo,
};
