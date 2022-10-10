import { hit, createUrlObject } from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet trusted-load-script
 *
 * @description
 * Adds a script tag with a given url as src.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('trusted-load-script', url)
 * ```
 *
 * - `url` - required, string that represents a resource url
 *
 * **Examples**
 * ```
 * rossmann.de#%#//scriptlet('trusted-load-script', 'https://mpsnare.iesnare.com/snare.js')
 * ```
 */
/* eslint-enable max-len */
export function trustedLoadScript(source, url) {
    // eslint-disable-next-line no-console
    const log = console.log.bind(console);

    if (!url) {
        return;
    }

    const urlOBject = createUrlObject(url);
    if (!urlOBject) {
        if (source.verbose) {
            log(`Error loading script: ${url}`);
        }
        return;
    }

    const scriptTag = document.createElement('script');
    scriptTag.src = urlOBject;
    scriptTag.onload = () => {
        hit(source);
    };
    scriptTag.onerror = (e) => {
        if (source.verbose) {
            log(`Error loading script: ${e}`);
        }
    };

    document.body.appendChild(scriptTag);
    scriptTag.remove();
}

trustedLoadScript.names = [
    'trusted-load-script',
];

trustedLoadScript.injections = [hit, createUrlObject];
