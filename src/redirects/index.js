import {
    attachDependencies,
    addCall,
    wrapInNonameFunc,
    passSourceAndProps,
} from '../helpers/injector';

import validator from '../helpers/validator';

import {
    convertUboRedirectToAdg,
    convertAbpRedirectToAdg,
    convertRedirectToAdg,
    convertRedirectNameToAdg,
    convertAdgRedirectToUbo,
} from '../helpers/converter';

import * as redirectsList from './redirects-list';

import Redirects from './redirects';

// eslint-disable-next-line import/no-unresolved
import { redirectsMap } from '../../tmp/redirects-map';

/**
 * Finds redirect resource by it's name
 *
 * @param {string} name - redirect name
 * @returns {Function}
 */
const getRedirectByName = (name) => {
    const redirects = Object.keys(redirectsList).map((key) => redirectsList[key]);
    return redirects.find((r) => r.names && r.names.includes(name));
};

/**
 * @typedef {object} Source - redirect properties
 * @property {string} name redirect name
 * @property {Array<string>} args Arguments for redirect function
 * @property {'extension'|'test'} [engine] -
 * Defines the final form of redirect string presentation
 * @property {boolean} [verbose] flag to enable printing to console debug information
 */

/**
 * Returns redirect code by param
 *
 * @param {Source} source
 * @returns {string} redirect code
 */
const getRedirectCode = (source) => {
    const redirect = getRedirectByName(source.name);
    let result = attachDependencies(redirect);
    result = addCall(redirect, result);

    // redirect code for different sources is checked in tests
    // so it should be just a code without any source and props passed
    result = source.engine === 'test'
        ? wrapInNonameFunc(result)
        : passSourceAndProps(source, result, true);

    return result;
};

const getRedirectFilename = (name) => {
    return redirectsMap[name];
};

export const redirects = {
    Redirects,
    getRedirectFilename,
    getCode: getRedirectCode,
    isAdgRedirectRule: validator.isAdgRedirectRule,
    isValidAdgRedirectRule: validator.isValidAdgRedirectRule,
    isAdgRedirectCompatibleWithUbo: validator.isAdgRedirectCompatibleWithUbo,
    isUboRedirectCompatibleWithAdg: validator.isUboRedirectCompatibleWithAdg,
    isAbpRedirectCompatibleWithAdg: validator.isAbpRedirectCompatibleWithAdg,
    convertUboRedirectToAdg,
    convertAbpRedirectToAdg,
    convertRedirectToAdg,
    convertRedirectNameToAdg,
    convertAdgRedirectToUbo,
};
