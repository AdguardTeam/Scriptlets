export { Redirects } from './redirects.js';

/**
 * For a given name or alias of redirect returns the corresponding filename
 * @param {string} name — name or alias of redirect
 * @returns {string} — Redirect's filename with extension
 */
declare function getRedirectFilename(name: string): string;

export { getRedirectFilename };
