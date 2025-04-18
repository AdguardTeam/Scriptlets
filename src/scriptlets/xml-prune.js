import {
    hit,
    logMessage,
    toRegExp,
    getXhrData,
    objectToString,
    matchRequestProps,
    getMatchPropsData,
    getRequestProps,
    isValidParsedData,
    parseMatchProps,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet xml-prune
 *
 * @description
 * Removes an element from the specified XML.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#xml-prunejs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('xml-prune'[, propsToMatch[, optionalProp[, urlToMatch]]])
 * ```
 *
 * - `propsToMatch` — optional, XPath or selector of elements which will be removed from XML
 * - `optionalProp` — optional, selector of elements that must occur in XML document
 * - `urlToMatch` — optional, string or regular expression for matching the request's URL
 * - `verbose` — optional, boolean, if set to 'true' will log original and modified XML content
 *
 * > `verbose` may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * > Usage with no arguments will log response payload and URL to browser console;
 * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * ### Examples
 *
 * 1. Remove `Period` tag whose `id` contains `-ad-` from all requests
 *
 *     ```adblock
 *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]')
 *     ```
 *
 *     Input XML:
 *
 *     ```xml
 *     <Period id="main"/>
 *     <Period id="123-ad-456"/>
 *     ```
 *
 *     Resulting XML:
 *
 *     ```xml
 *     <Period id="main"/>
 *     ```
 *
 * 1. Remove `Period` tag whose `id` contains `-ad-`, only if XML contains `SegmentTemplate`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]', 'SegmentTemplate')
 *     ```
 *
 *     Input XML:
 *
 *     ```xml
 *     <Period id="preroll-ad">
 *       <SegmentTemplate />
 *     </Period>
 *     <Period id="content"/>
 *     ```
 *
 *     Resulting XML:
 *
 *     ```xml
 *     <Period id="content"/>
 *     ```
 *
 * 1. Remove `Period` tag whose `id` contains `-ad-`, only if request's URL contains `.mpd`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]', '', '.mpd')
 *     ```
 *
 *     Input XML:
 *
 *     ```xml
 *     <Period id="intro"/>
 *     <Period id="ads-ad-block"/>
 *     ```
 *
 *     Resulting XML:
 *
 *     ```xml
 *     <Period id="intro"/>
 *     ```
 *
 * 1. Remove `Period` tag whose `id` contains `-ad-`, only if request's URL contains `.mpd` and log content
 *
 *     ```adblock
 *     example.org#%#//scriptlet('xml-prune', 'Period[id*="-ad-"]', '', '.mpd', 'true')
 *     ```
 *
 *     Input XML:
 *
 *     ```xml
 *     <Period id="pre-roll-ad"/>
 *     <Period id="movie"/>
 *     ```
 *
 *     Resulting XML:
 *
 *     ```xml
 *     <Period id="movie"/>
 *     ```
 *
 * 1. Remove `Period` tag whose `id` contains `pre-roll` and remove `duration` attribute from the `Period` tag
 *    by using XPath expression
 *
 *     <!-- markdownlint-disable line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('xml-prune', 'xpath(//*[name()="Period"][contains(@id, "pre-roll") and contains(@id, "-ad-")] | //*[name()="Period"]/@duration)')
 *     ```
 *
 *     <!-- markdownlint-enable line-length -->
 *
 *     Input XML:
 *
 *     ```xml
 *     <Period id="pre-roll-ad" duration="PT5S"/>
 *     <Period id="main" duration="PT30M"/>
 *     ```
 *
 *     Resulting XML:
 *
 *     ```xml
 *     <Period id="main"/>
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
 * @added v1.7.3.
 */
/* eslint-enable max-len */

export function xmlPrune(source, propsToRemove, optionalProp = '', urlToMatch = '', verbose = false) {
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

    let shouldPruneResponse = false;

    const shouldLogContent = verbose === 'true';

    const urlMatchRegexp = toRegExp(urlToMatch);

    const XPATH_MARKER = 'xpath(';
    const isXpath = propsToRemove && propsToRemove.startsWith(XPATH_MARKER);

    /**
     * Checks if the document node from the XML document contains propsToRemove
     * if so, returns an array with matched elements, otherwise returns an empty array
     *
     * @param {Node} contextNode - document node from XML document
     * @returns {Array}
     */
    const getXPathElements = (contextNode) => {
        const matchedElements = [];
        try {
            const elementsToRemove = propsToRemove.slice(XPATH_MARKER.length, -1);
            const xpathResult = contextNode.evaluate(
                elementsToRemove,
                contextNode,
                null,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                null,
            );
            for (let i = 0; i < xpathResult.snapshotLength; i += 1) {
                matchedElements.push(xpathResult.snapshotItem(i));
            }
        } catch (ex) {
            const message = `Invalid XPath parameter: ${propsToRemove}\n${ex}`;
            logMessage(source, message);
        }
        return matchedElements;
    };

    const xPathPruning = (xPathElements) => {
        xPathElements.forEach((element) => {
            // ELEMENT_NODE
            if (element.nodeType === 1) {
                element.remove();
                // ATTRIBUTE_NODE
            } else if (element.nodeType === 2) {
                element.ownerElement.removeAttribute(element.nodeName);
            }
        });
    };

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

    const isPruningNeeded = (response, propsToRemove) => {
        if (!isXML(response)) {
            return false;
        }
        const docXML = createXMLDocument(response);
        return isXpath ? getXPathElements(docXML) : !!docXML.querySelector(propsToRemove);
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
        const elements = isXpath ? getXPathElements(xmlDoc) : xmlDoc.querySelectorAll(propsToRemove);
        if (!elements.length) {
            shouldPruneResponse = false;
            return text;
        }
        if (shouldLogContent) {
            // It's necessary to clone the XML document because xmlDoc is logged with removed elements
            const cloneXmlDoc = xmlDoc.cloneNode(true);
            logMessage(source, 'Original xml:');
            logMessage(source, cloneXmlDoc, true, false);
        }
        if (isXpath) {
            xPathPruning(elements);
        } else {
            elements.forEach((elem) => {
                elem.remove();
            });
        }
        if (shouldLogContent) {
            logMessage(source, 'Modified xml:');
            logMessage(source, xmlDoc, true, false);
        }
        const serializer = new XMLSerializer();
        text = serializer.serializeToString(xmlDoc);
        return text;
    };

    const nativeOpen = window.XMLHttpRequest.prototype.open;
    const nativeSend = window.XMLHttpRequest.prototype.send;

    let xhrData;

    const openWrapper = (target, thisArg, args) => {
        // eslint-disable-next-line prefer-spread
        xhrData = getXhrData.apply(null, args);

        if (matchRequestProps(source, urlToMatch, xhrData)) {
            thisArg.shouldBePruned = true;
        }

        // Trap setRequestHeader of target xhr object to mimic request headers later
        if (thisArg.shouldBePruned) {
            thisArg.collectedHeaders = [];
            const setRequestHeaderWrapper = (target, thisArg, args) => {
                // Collect headers
                thisArg.collectedHeaders.push(args);
                return Reflect.apply(target, thisArg, args);
            };

            const setRequestHeaderHandler = {
                apply: setRequestHeaderWrapper,
            };

            // setRequestHeader can only be called on open xhr object,
            // so we can safely proxy it here
            thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
        }

        return Reflect.apply(target, thisArg, args);
    };

    const sendWrapper = (target, thisArg, args) => {
        const allowedResponseTypeValues = ['', 'text'];
        // Do nothing if request do not match
        // or response type is not a string
        if (!thisArg.shouldBePruned || !allowedResponseTypeValues.includes(thisArg.responseType)) {
            return Reflect.apply(target, thisArg, args);
        }

        /**
         * Create separate XHR request with original request's input
         * to be able to collect response data without triggering
         * listeners on original XHR object
         */
        const forgedRequest = new XMLHttpRequest();
        forgedRequest.addEventListener('readystatechange', () => {
            if (forgedRequest.readyState !== 4) {
                return;
            }

            const {
                readyState,
                response,
                responseText,
                responseURL,
                responseXML,
                status,
                statusText,
            } = forgedRequest;

            // Extract content from response
            const content = responseText || response;
            if (typeof content !== 'string') {
                return;
            }

            if (!propsToRemove) {
                if (isXML(response)) {
                    const message = `XMLHttpRequest.open() URL: ${responseURL}\nresponse: ${response}`;
                    logMessage(source, message);
                    logMessage(source, createXMLDocument(response), true, false);
                }
            } else {
                shouldPruneResponse = isPruningNeeded(response, propsToRemove);
            }
            const responseContent = shouldPruneResponse ? pruneXML(response) : response;
            // Manually put required values into target XHR object
            // as thisArg can't be redefined and XHR objects can't be (re)assigned or copied
            Object.defineProperties(thisArg, {
                // original values
                readyState: { value: readyState, writable: false },
                responseURL: { value: responseURL, writable: false },
                responseXML: { value: responseXML, writable: false },
                status: { value: status, writable: false },
                statusText: { value: statusText, writable: false },
                // modified values
                response: { value: responseContent, writable: false },
                responseText: { value: responseContent, writable: false },
            });

            // Mock events
            setTimeout(() => {
                const stateEvent = new Event('readystatechange');
                thisArg.dispatchEvent(stateEvent);

                const loadEvent = new Event('load');
                thisArg.dispatchEvent(loadEvent);

                const loadEndEvent = new Event('loadend');
                thisArg.dispatchEvent(loadEndEvent);
            }, 1);
            hit(source);
        });

        nativeOpen.apply(forgedRequest, [xhrData.method, xhrData.url]);

        // Mimic request headers before sending
        // setRequestHeader can only be called on open request objects
        thisArg.collectedHeaders.forEach((header) => {
            const name = header[0];
            const value = header[1];

            forgedRequest.setRequestHeader(name, value);
        });
        thisArg.collectedHeaders = [];

        try {
            nativeSend.call(forgedRequest, args);
        } catch {
            return Reflect.apply(target, thisArg, args);
        }
        return undefined;
    };

    const openHandler = {
        apply: openWrapper,
    };

    const sendHandler = {
        apply: sendWrapper,
    };

    XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, openHandler);
    XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, sendHandler);

    const nativeFetch = window.fetch;

    const fetchWrapper = async (target, thisArg, args) => {
        const fetchURL = args[0] instanceof Request ? args[0].url : args[0];
        if (typeof fetchURL !== 'string' || fetchURL.length === 0) {
            return Reflect.apply(target, thisArg, args);
        }
        if (urlMatchRegexp.test(fetchURL)) {
            const response = await nativeFetch(...args);
            // It's required to fix issue with - Request with body": Failed to execute 'fetch' on 'Window':
            // Cannot construct a Request with a Request object that has already been used.
            // For example, it occurs on youtube when scriptlet is used without arguments
            const clonedResponse = response.clone();
            const responseText = await response.text();
            shouldPruneResponse = isPruningNeeded(responseText, propsToRemove);
            if (!shouldPruneResponse) {
                const message = `fetch URL: ${fetchURL}\nresponse text: ${responseText}`;
                logMessage(source, message);
                logMessage(source, createXMLDocument(responseText), true, false);
                return clonedResponse;
            }
            const prunedText = pruneXML(responseText);
            if (shouldPruneResponse) {
                hit(source);
                return new Response(prunedText, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                });
            }
            return clonedResponse;
        }
        return Reflect.apply(target, thisArg, args);
    };

    const fetchHandler = {
        apply: fetchWrapper,
    };

    window.fetch = new Proxy(window.fetch, fetchHandler);
}

export const xmlPruneNames = [
    'xml-prune',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'xml-prune.js',
    'ubo-xml-prune.js',
    'ubo-xml-prune',
];

// eslint-disable-next-line prefer-destructuring
xmlPrune.primaryName = xmlPruneNames[0];

xmlPrune.injections = [
    hit,
    logMessage,
    toRegExp,
    getXhrData,
    objectToString,
    matchRequestProps,
    getMatchPropsData,
    getRequestProps,
    isValidParsedData,
    parseMatchProps,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
];
