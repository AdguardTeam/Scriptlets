import jsYaml from 'js-yaml';

/**
 * RedirectSource
 * e.g.
 * {
 *      title: 1x1-transparent.gif
 *      comment: http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever
 *      contentType: image/gif;base64
 *      content: R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
 * }
 * @typedef {Object} RedirectSource
 * @property {string} title
 * @property {string} comment
 * @property {string} content
 * @property {string} contentType
 */


class Redirects {
    /**
     * Converts rawYaml into JS object with sources titles used as keys
     * @param rawYaml
     * @returns {Object<RedirectSource>} - return object with titles in the keys and RedirectSources
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
     * @param {string} title
     * @return {RedirectSource}
     */
    getSource(title) {
        return this.redirects[title];
    }

    /**
     * Returns content of source object by title
     * @param {string} title
     * @returns {string}
     */
    getContent(title) {
        return this.redirects[title].content;
    }

    /**
     * Returns contentType of source object by title
     * @param {string} title
     * @returns {string}
     */
    getContentType(title) {
        return this.redirects[title].contentType;
    }

    /**
     * Returns comment of source object by title
     * @param {string} title
     * @returns {string}
     */
    getCommentType(title) {
        return this.redirects[title].comment;
    }
}

export default Redirects;
