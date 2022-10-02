import {
    hit,
    toRegExp,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet xml-prune
 *
 * @description
 * Removes an element from the specified XML.
 *
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('xml-prune'[, propsToMatch[, optionalProp[, urlToMatch]]])
 * ```
 *
 * - `propsToMatch` - required, selector of elements which will be removed from XML
 * - `optionalProp` - optional, selector of elements that must occur in XML document
 * - `urlToMatch` - optional, string or regular expression for matching the request's URL
 *
 * **Examples**
 * 1. Removes `Period` tag which `id` contains `-ad-` from all requests
 *     ```
 *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]')
 *     ```
 *
 * 2. Removes `Period` tag which `id` contains `-ad-`, only if XML contains `SegmentTemplate`
 *     ```
 *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]', 'SegmentTemplate')
 *     ```
 *
 * 3. Removes `Period` tag which `id` contains `-ad-`, only if request's URL contains `.mpd`
 *     ```
 *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]', '', '.mpd')
 *     ```
 */
/* eslint-disable max-len */

export function xmlPrune(source, propsToRemove, optionalProp = '', urlToMatch) {
    // do nothing if browser does not support fetch or Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof fetch === 'undefined'
        || typeof Proxy === 'undefined'
        || typeof Response === 'undefined') {
        return;
    }

    if (typeof propsToRemove === 'undefined') {
        return;
    }

    urlToMatch = toRegExp(urlToMatch);

    const prunerXML = (text) => {
        if ((/^\s*</.test(text) && />\s*$/.test(text)) === false) {
            return text;
        }
        try {
            const xmlParser = new DOMParser();
            const xmlDoc = xmlParser.parseFromString(text, 'text/xml');
            if (optionalProp !== '' && xmlDoc.querySelector(optionalProp) === null) {
                return text;
            }
            const elems = xmlDoc.querySelectorAll(propsToRemove);
            if (elems.length !== 0) {
                elems.forEach((elem) => {
                    elem.remove();
                });
                const serializer = new XMLSerializer();
                text = serializer.serializeToString(xmlDoc);
            }
        } catch (ex) {
            // eslint-disable-next-line no-console
            console.log(ex);
        }
        return text;
    };

    const xhrWrapper = (target, thisArg, args) => {
        const xhrURL = args[1];
        if (typeof xhrURL !== 'string' || xhrURL.length === 0) {
            return Reflect.apply(target, thisArg, args);
        }
        if (urlToMatch.test(xhrURL)) {
            thisArg.addEventListener('readystatechange', () => {
                if (thisArg.readyState === 4) {
                    const { response } = thisArg;
                    const prunedResponseContent = prunerXML(response);
                    Object.defineProperty(thisArg, 'response', {
                        value: prunedResponseContent,
                    });
                    Object.defineProperty(thisArg, 'responseText', {
                        value: prunedResponseContent,
                    });
                    hit(source);
                }
            });
        }
        hit(source);
        return Reflect.apply(target, thisArg, args);
    };

    const xhrHandler = {
        apply: xhrWrapper,
    };
    window.XMLHttpRequest.prototype.open = new Proxy(window.XMLHttpRequest.prototype.open, xhrHandler);

    // eslint-disable-next-line compat/compat
    const realFetch = window.fetch;

    const fetchWrapper = (target, thisArg, args) => {
        const fetchURL = args[0];
        if (typeof fetchURL !== 'string' || fetchURL.length === 0) {
            hit(source);
            return Reflect.apply(target, thisArg, args);
        }
        if (urlToMatch.test(fetchURL)) {
            hit(source);
            return realFetch.apply(this, args).then((response) => {
                return response.text().then((text) => {
                    return new Response(prunerXML(text), {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers,
                    });
                });
            });
        }
        hit(source);
        return Reflect.apply(target, thisArg, args);
    };

    const fetchHandler = {
        apply: fetchWrapper,
    };
    // eslint-disable-next-line compat/compat
    window.fetch = new Proxy(window.fetch, fetchHandler);
}

xmlPrune.names = [
    'xml-prune',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'xml-prune.js',
];

xmlPrune.injections = [
    hit,
    toRegExp,
];
