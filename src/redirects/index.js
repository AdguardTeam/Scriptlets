import { Redirects } from './redirects';
// eslint-disable-next-line import/no-unresolved
import { redirectsMap } from '../../tmp/redirects-map';

/**
 * For a given name or alias of redirect returns the corresponding filename
 * @param {string} name — name or alias of redirect
 * @returns {string} — Redirect's filename with extension
 */
const getRedirectFilename = (name) => {
    return redirectsMap[name];
};

export {
    Redirects,
    getRedirectFilename,
};
