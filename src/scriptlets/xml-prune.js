import {
    hit,
    logMessage,
    toRegExp,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet xml-prune
 *
 * @description
 * Removes an element from the specified XML.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('xml-prune'[, propsToMatch[, optionalProp[, urlToMatch]]])
 * ```
 *
 * - `propsToMatch` — optional, selector of elements which will be removed from XML
 * - `optionalProp` — optional, selector of elements that must occur in XML document
 * - `urlToMatch` — optional, string or regular expression for matching the request's URL
 *
 * > Usage with no arguments will log response payload and URL to browser console;
 * > which is useful for debugging but prohibited for production filter lists.
 *
 * ### Examples
 *
 * 1. Remove `Period` tag whose `id` contains `-ad-` from all requests
 *
 *     ```adblock
 *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]')
 *     ```
 *
 * 1. Remove `Period` tag whose `id` contains `-ad-`, only if XML contains `SegmentTemplate`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]', 'SegmentTemplate')
 *     ```
 *
 * 1. Remove `Period` tag whose `id` contains `-ad-`, only if request's URL contains `.mpd`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]', '', '.mpd')
 *     ```
 *
 * 1. Call with no arguments will log response payload and URL at the console
 *
 *     ```adblock
 *     example.org#%#//scriptlet('xml-prune')
 *     ```
 *
 * 1. Call with only `urlToMatch` argument will log response payload and URL only for the matched URL
 *
 *     ```adblock
 *     example.org#%#//scriptlet('xml-prune', '', '', '.mpd')
 *     ```
 *
 * @added 1.7.3.
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
        // It's necessary to check the type of 'text'
        // because 'text' is obtained from the xhr/fetch response,
        // so it could also be Blob/ArrayBuffer/Object or another type
        if (typeof text === 'string') {
            // Check if "text" starts with "<" and check if it ends with ">"
            // If so, then it might be an XML file and should be pruned or logged
            const trimmedText = text.trim();
            if (trimmedText.startsWith('<') && trimmedText.endsWith('>')) {
                return true;
            }
        }
        return false;
    };

    const createXMLDocument = (text) => {
        const xmlParser = new DOMParser();
        const xmlDocument = xmlParser.parseFromString(text, 'text/xml');
        return xmlDocument;
    };

    const pruneXML = (text) => {
        if (!isXML(text)) {
            shouldPruneResponse = false;
            return text;
        }
        const xmlDoc = createXMLDocument(text);
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
                            const message = `XMLHttpRequest.open() URL: ${xhrURL}\nresponse: ${response}`;
                            logMessage(source, message);
                            logMessage(source, createXMLDocument(response), true, false);
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

    const nativeFetch = window.fetch;

    const fetchWrapper = (target, thisArg, args) => {
        const fetchURL = args[0] instanceof Request ? args[0].url : args[0];
        if (typeof fetchURL !== 'string' || fetchURL.length === 0) {
            return Reflect.apply(target, thisArg, args);
        }
        if (urlMatchRegexp.test(fetchURL)) {
            return nativeFetch.apply(this, args).then((response) => {
                return response.text().then((text) => {
                    if (!shouldPruneResponse) {
                        if (isXML(text)) {
                            const message = `fetch URL: ${fetchURL}\nresponse text: ${text}`;
                            logMessage(source, message);
                            logMessage(source, createXMLDocument(text), true, false);
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
];
