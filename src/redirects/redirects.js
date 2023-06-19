import jsYaml from 'js-yaml';

/**
 * Redirect - object used to redirect some requests
 * e.g.
 * {
 *      title: 1x1-transparent.gif
 *      comment: http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever
 *      contentType: image/gif;base64
 *      content: R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
 * }
 *
 * @typedef {object} Redirect
 * @property {string} title resource name
 * @property {string} comment resource description
 * @property {string} content encoded resource content
 * @property {string} contentType MIME type
 * @property {boolean} [isBlocking] e.g click2load redirect
 * @property {string} [sha] hash
 */

class Redirects {
    /**
     * Converts rawYaml into JS object with sources titles used as keys
     *
     * @param {string} rawYaml
     * @returns {Object<Redirect>} - return object with titles in the keys and RedirectSources
     * in the values
     */
    constructor(rawYaml) {
        try {
            const arrOfRedirects = jsYaml.safeLoad(rawYaml);
            this.redirects = arrOfRedirects.reduce((acc, redirect) => {
                return {
                    ...acc,
                    [redirect.title]: redirect,
                };
            }, {});
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log(`Was unable to load YAML into JS due to: ${e.message}`);
            throw e;
        }
    }

    /**
     * Returns redirect source object
     *
     * @param {string} title
     * @returns {Redirect|undefined} Found redirect source object, or `undefined` if not found.
     */
    getRedirect(title) {
        if (Object.prototype.hasOwnProperty.call(this.redirects, title)) {
            return this.redirects[title];
        }

        // look title among aliases
        const values = Object.keys(this.redirects)
            .map((key) => this.redirects[key]);
        return values.find((redirect) => {
            const { aliases } = redirect;
            if (!aliases) {
                return false;
            }
            return aliases.includes(title);
        });
    }

    /**
     * Checks if redirect is blocking like click2load.html
     *
     * @param {string} title Title of the redirect.
     * @returns {boolean} True if redirect is blocking otherwise returns `false` even if redirect name is
     * unknown.
     */
    isBlocking(title) {
        const redirect = this.redirects[title];
        if (redirect) {
            return !!redirect.isBlocking;
        }
        return false;
    }
}

export default Redirects;
