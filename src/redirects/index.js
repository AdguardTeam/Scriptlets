import {
    attachDependencies,
    addCall,
    wrapInNonameFunc,
    passSourceAndProps,
} from '../helpers/injector';

// FIXME remove
// import validator from '../validators/validator';

// FIXME remove
// import {
//     convertUboRedirectToAdg,
//     convertAbpRedirectToAdg,
//     convertRedirectToAdg,
//     convertRedirectNameToAdg,
//     convertAdgRedirectToUbo,
// } from '../helpers/converter';



import Redirects from './redirects';

// eslint-disable-next-line import/no-unresolved
import { redirectsMap } from '../../tmp/redirects-map';



/**
 * @typedef {object} Source - redirect properties
 * @property {string} name redirect name
 * @property {Array<string>} args Arguments for redirect function
 * @property {'extension'|'test'} [engine] -
 * Defines the final form of redirect string presentation
 * @property {boolean} [verbose] flag to enable printing to console debug information
 */

const getRedirectFilename = (name) => {
    return redirectsMap[name];
};

export const redirects = {
    Redirects,
    getRedirectFilename,
    // getCode: getRedirectCode,

    // // FIXME move to @adguard/scriptlets/validators module
    // isAdgRedirectRule: validator.isAdgRedirectRule,
    // isValidAdgRedirectRule: validator.isValidAdgRedirectRule,
    // isRedirectResourceCompatibleWithAdg: validator.isRedirectResourceCompatibleWithAdg,
    // isAdgRedirectCompatibleWithUbo: validator.isAdgRedirectCompatibleWithUbo,
    // isUboRedirectCompatibleWithAdg: validator.isUboRedirectCompatibleWithAdg,
    // isAbpRedirectCompatibleWithAdg: validator.isAbpRedirectCompatibleWithAdg,
    //
    // // FIXME move to @adguard/scriptlets/converters module
    // convertUboRedirectToAdg,
    // convertAbpRedirectToAdg,
    // convertRedirectToAdg,
    // convertRedirectNameToAdg,
    // convertAdgRedirectToUbo,
};
