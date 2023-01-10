import {
    hit,
    logMessage,
    toRegExp,
    startsWith,
    endsWith,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet xml-prune
 * @description
 * Removes an element from the specified XML.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('xml-prune'[, propsToMatch[, optionalProp[, urlToMatch]]])
 * ```
 *
 * - `propsToMatch` - optional, selector of elements which will be removed from XML
 * - `optionalProp` - optional, selector of elements that must occur in XML document
 * - `urlToMatch` - optional, string or regular expression for matching the request's URL
 * > Usage with no arguments will log response payload and URL to browser console;
 * which is useful for debugging but prohibited for production filter lists.
 *
 * **Examples**
 * 1. Remove `Period` tag whose `id` contains `-ad-` from all requests
 *     ```
 *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]')
 *     ```
 *
 * 2. Remove `Period` tag whose `id` contains `-ad-`, only if XML contains `SegmentTemplate`
 *     ```
 *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]', 'SegmentTemplate')
 *     ```
 *
 * 3. Remove `Period` tag whose `id` contains `-ad-`, only if request's URL contains `.mpd`
 *     ```
 *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]', '', '.mpd')
 *     ```
 *
 * 4. Call with no arguments will log response payload and URL at the console
 *     ```
 *     example.org#%#//scriptlet('xml-prune')
 *     ```
 *
 * 5. Call with only `urlToMatch` argument will log response payload and URL only for the matched URL
 *     ```
 *     example.org#%#//scriptlet('xml-prune', '', '', '.mpd')
 *     ```
 */
/* eslint-enable max-len */

export function xmlPrune(source, propsToRemove, optionalProp = '', urlToMatch) {
    // do nothing if browser does not support Reflect, fetch or Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect
    if (typeof Reflect === 'undefined'
        || typeof fetch === 'undefined'
        || typeof Proxy === 'undefined'
        || typeof Response === 'undefined') {
        return;
    }

    let shouldPruneResponse = true;

    if (!propsToRemove) {
        // If "propsToRemove" is not defined, then response shouldn't be pruned
        // but it should be logged in browser console
        shouldPruneResponse = false;
    }

    const urlMatchRegexp = toRegExp(urlToMatch);

    const isXML = (text) => {
        // Check if "text" starts with "<" and check if it ends with ">"
        // If so, then it might be an XML file and should be pruned or logged
        const trimedText = text.trim();
        if (startsWith(trimedText, '<') && endsWith(trimedText, '>')) {
            return true;
        }
        return false;
    };

    const pruneXML = (text) => {
        if (!isXML(text)) {
            shouldPruneResponse = false;
            return text;
        }
        const xmlParser = new DOMParser();
        const xmlDoc = xmlParser.parseFromString(text, 'text/xml');
        const errorNode = xmlDoc.querySelector('parsererror');
        if (errorNode) {
            return text;
        }
        if (optionalProp !== '' && xmlDoc.querySelector(optionalProp) === null) {
            shouldPruneResponse = false;
            return text;
        }
        const elems = xmlDoc.querySelectorAll(propsToRemove);
        if (!elems.length) {
            shouldPruneResponse = false;
            return text;
        }
        elems.forEach((elem) => {
            elem.remove();
        });
        const serializer = new XMLSerializer();
        text = serializer.serializeToString(xmlDoc);
        return text;
    };

    const xhrWrapper = (target, thisArg, args) => {
        const xhrURL = args[1];
        if (typeof xhrURL !== 'string' || xhrURL.length === 0) {
            return Reflect.apply(target, thisArg, args);
        }
        if (urlMatchRegexp.test(xhrURL)) {
            thisArg.addEventListener('readystatechange', function pruneResponse() {
                if (thisArg.readyState === 4) {
                    const { response } = thisArg;
                    thisArg.removeEventListener('readystatechange', pruneResponse);
                    if (!shouldPruneResponse) {
                        if (isXML(response)) {
                            // eslint-disable-next-line max-len
                            const message = `XMLHttpRequest.open() URL: ${xhrURL}\nresponse: ${response}`;
                            logMessage(message);
                        }
                    } else {
                        const prunedResponseContent = pruneXML(response);
                        if (shouldPruneResponse) {
                            Object.defineProperty(thisArg, 'response', {
                                value: prunedResponseContent,
                            });
                            Object.defineProperty(thisArg, 'responseText', {
                                value: prunedResponseContent,
                            });
                            hit(source);
                        }
                        // In case if response shouldn't be pruned
                        // pruneXML sets shouldPruneResponse to false
                        // so it's necessary to set it to true again
                        // otherwise response will be only logged
                        shouldPruneResponse = true;
                    }
                }
            });
        }
        return Reflect.apply(target, thisArg, args);
    };

    const xhrHandler = {
        apply: xhrWrapper,
    };
    // eslint-disable-next-line max-len
    window.XMLHttpRequest.prototype.open = new Proxy(window.XMLHttpRequest.prototype.open, xhrHandler);

    // eslint-disable-next-line compat/compat
    const nativeFetch = window.fetch;

    const fetchWrapper = (target, thisArg, args) => {
        const fetchURL = args[0];
        if (typeof fetchURL !== 'string' || fetchURL.length === 0) {
            return Reflect.apply(target, thisArg, args);
        }
        if (urlMatchRegexp.test(fetchURL)) {
            return nativeFetch.apply(this, args).then((response) => {
                return response.text().then((text) => {
                    if (!shouldPruneResponse) {
                        if (isXML(text)) {
                            logMessage(`fetch URL: ${fetchURL}\nresponse text: ${text}`);
                        }
                        return Reflect.apply(target, thisArg, args);
                    }
                    const prunedText = pruneXML(text);
                    if (shouldPruneResponse) {
                        hit(source);
                        return new Response(prunedText, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                        });
                    }
                    // If response shouldn't be pruned
                    // pruneXML sets shouldPruneResponse to false
                    // so it's necessary to set it to true again
                    // otherwise response will be only logged
                    shouldPruneResponse = true;
                    return Reflect.apply(target, thisArg, args);
                });
            });
        }
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
    'ubo-xml-prune.js',
    'ubo-xml-prune',
];

xmlPrune.injections = [
    hit,
    logMessage,
    toRegExp,
    startsWith,
    endsWith,
];
