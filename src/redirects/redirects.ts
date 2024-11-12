import jsYaml from 'js-yaml';

import { getErrorMessage } from '../helpers';

/**
 * Represents a redirect configuration used to redirect requests.
 *
 * @example
 * ```json
 * {
 *   "title": "1x1-transparent.gif",
 *   "description": "A transparent GIF image.",
 *   "comment": "http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever",
 *   "contentType": "image/gif;base64",
 *   "content": "R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
 * }
 * ```
 */
export interface Redirect {
    /**
     * The name of the redirect.
     */
    title: string;

    /**
     * A description of the redirect.
     */
    description: string;

    /**
     * Alternative titles for the redirect.
     */
    aliases?: string[];

    /**
     * Additional comments or notes about the redirect.
     */
    comment: string;

    /**
     * The encoded content of the redirect.
     */
    content: string;

    /**
     * The MIME type of the content.
     */
    contentType: string;

    /**
     * Indicates whether the redirect is blocking (e.g., "click2load.html").
     */
    isBlocking?: boolean;

    /**
     * The hash of the content.
     */
    sha?: string;

    /**
     * The file name associated with the redirect.
     */
    file?: string;
}

/**
 * Manages a collection of redirects loaded from a YAML configuration.
 */
export class Redirects {
    private readonly redirects: Record<string, Redirect>;

    /**
     * Initializes the Redirects instance by loading redirects from a YAML string.
     *
     * @param rawYaml The raw YAML string containing redirect configurations.
     */
    constructor(rawYaml: string) {
        try {
            const arrOfRedirects = jsYaml.safeLoad(rawYaml) as Redirect[];
            this.redirects = arrOfRedirects.reduce((acc, redirect) => {
                return {
                    ...acc,
                    [redirect.title]: redirect,
                };
            }, {});
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log(`Unable to load YAML into JavaScript: ${getErrorMessage(e)}`);
            throw e;
        }
    }

    /**
     * Retrieves the redirect object associated with the specified title.
     *
     * @param title The title of the redirect to retrieve.
     * @returns The redirect object if found; otherwise, `undefined`.
     */
    getRedirect(title: string): Redirect | undefined {
        if (Object.prototype.hasOwnProperty.call(this.redirects, title)) {
            return this.redirects[title];
        }

        // Search for the title among aliases
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
     * Determines whether the specified redirect is blocking.
     *
     * @param title The title of the redirect to check.
     * @returns `true` if the redirect is blocking; otherwise, `false`, even if the redirect name is unknown.
     */
    isBlocking(title: string): boolean {
        const redirect = this.redirects[title];
        if (redirect) {
            return !!redirect.isBlocking;
        }
        return false;
    }
}
