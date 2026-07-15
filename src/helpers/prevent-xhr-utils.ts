import { hit } from './hit';
import { logMessage } from './log-message';
import { matchRequestProps } from './match-request-props';
import { getXhrData } from './request-utils';
import { objectToString, generateResponseContent } from './string-utils';
import { type Source } from '../scriptlets';

/**
 * Sets up XMLHttpRequest interception to prevent matched requests from
 * reaching the network, substituting a generated response.
 *
 * Shared core used by both `prevent-xhr` (untrusted) and `trusted-prevent-xhr`
 * scriptlets. The `trusted` flag controls whether literal text is passed
 * through as the response body.
 *
 * @param source Scriptlet source object for hit/logging.
 * @param propsToMatch Optional space-separated props to match;
 * `undefined` → log only (do not block).
 * @param trusted When `true`, non-keyword directives are returned as literal text.
 * @param directive Response-content directive (may be `undefined`).
 */
export function createPreventXhrCore(
    source: Source,
    propsToMatch: string | undefined,
    trusted: boolean,
    directive: string | undefined,
): void {
    // do nothing if browser does not support Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof Proxy === 'undefined') {
        return;
    }

    const nativeOpen: any = window.XMLHttpRequest.prototype.open;
    const nativeGetResponseHeader: any = window.XMLHttpRequest.prototype.getResponseHeader;
    const nativeGetAllResponseHeaders: any = window.XMLHttpRequest.prototype.getAllResponseHeaders;

    // Store matched XHR requests and their data in private structures
    // to prevent bypass via thisArg property manipulation
    // https://github.com/AdguardTeam/Scriptlets/issues/386
    const matchedXhrRequests = new Map();
    const xhrRequestHeaders = new Map();

    const openWrapper = (
        target: any,
        thisArg: any,
        args: any[],
    ): any => {
        // Get original request properties
        // eslint-disable-next-line prefer-spread
        const xhrData: any = getXhrData.apply(null, args as any);

        if (typeof propsToMatch === 'undefined') {
            // Log if no propsToMatch given
            logMessage(source, `xhr( ${objectToString(xhrData)} )`, true);
            hit(source);
        } else if (matchRequestProps(source, propsToMatch, xhrData)) {
            // First stage of the request lifecycle should be fired only if onreadystatechange is assigned
            // https://github.com/AdguardTeam/Scriptlets/issues/485
            if (typeof thisArg.onreadystatechange === 'function') {
                xhrData.shouldFireFirstStage = true;
            }
            // Store xhrData in map to keep original values in case of multiple requests
            // https://github.com/AdguardTeam/Scriptlets/issues/347
            matchedXhrRequests.set(thisArg, xhrData);
        }

        // Trap setRequestHeader of target xhr object to mimic request headers later;
        // needed for getResponseHeader() and getAllResponseHeaders() methods
        if (matchedXhrRequests.has(thisArg) && !xhrRequestHeaders.has(thisArg)) {
            xhrRequestHeaders.set(thisArg, []);
            const setRequestHeaderWrapper = (t: any, thisArg2: any, a: any[]): any => {
                // Collect headers
                const headers = xhrRequestHeaders.get(thisArg2);
                if (headers) {
                    headers.push(a);
                }
                return Reflect.apply(t, thisArg2, a);
            };
            const setRequestHeaderHandler = {
                apply: setRequestHeaderWrapper,
            };
            // setRequestHeader() can only be called on xhr.open(),
            // so we can safely proxy it here
            thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
        }
        return Reflect.apply(target, thisArg, args);
    };

    const sendWrapper = (target: any, thisArg: any, args: any[]): any => {
        if (!matchedXhrRequests.has(thisArg)) {
            return Reflect.apply(target, thisArg, args);
        }

        const storedXhrData = matchedXhrRequests.get(thisArg);

        const responseType = thisArg.responseType;

        let modifiedResponse: any = '';
        let modifiedResponseText = '';
        let modifiedResponseXML: any;

        // Whether responseText is accessible for this responseType.
        // Native XHR throws InvalidStateError when responseText is accessed
        // with any responseType other than '' or 'text' (including 'json',
        // 'blob', 'arraybuffer', and 'document').
        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseText
        let exposeResponseText = true;

        if (responseType === 'blob') {
            modifiedResponse = new Blob();
            exposeResponseText = false;
        } else if (responseType === 'arraybuffer') {
            modifiedResponse = new ArrayBuffer(0);
            exposeResponseText = false;
        } else if (responseType === 'document') {
            modifiedResponse = new DOMParser().parseFromString('', 'text/html');
            modifiedResponseXML = modifiedResponse;
            exposeResponseText = false;
        } else if (responseType === 'json') {
            // For json responseType, response is the parsed JSON object (or
            // null if the text is not valid JSON). Accessing responseText with
            // responseType 'json' throws InvalidStateError in native XHR
            // (Chromium included), so we do NOT expose it for the JSON branch.
            // Trusted directives can pass a literal JSON string (e.g.
            // '{"blocked":true}') that gets parsed and exposed as a parsed
            // object via response.
            let jsonText = '{}';
            if (directive) {
                const content = generateResponseContent(directive, trusted);
                if (content !== null) {
                    jsonText = content;
                } else {
                    logMessage(source, `Invalid randomize parameter: '${directive}'`);
                }
            }
            exposeResponseText = false;
            try {
                modifiedResponse = JSON.parse(jsonText);
            } catch {
                // Invalid JSON → response is null, matching native XHR behavior
                modifiedResponse = null;
            }
        } else if (directive) {
            const content = generateResponseContent(directive, trusted);
            if (content !== null) {
                modifiedResponse = content;
                modifiedResponseText = content;
            } else {
                logMessage(source, `Invalid randomize parameter: '${directive}'`);
            }
        }

        /**
         * Create separate XHR request with original request's input
         * to be able to collect response data without triggering
         * listeners on original XHR object
         */
        const forgedRequest = new XMLHttpRequest();

        /**
         * Used to manually simulate the progression of the readyState property.
         * By using Object.defineProperty, the function ensures
         * that the readyState can be modified and configured appropriately,
         * while allowing the property to be writable.
         *
         * @param state request status number.
         */
        const transitionReadyState = (state: number): void => {
            // For readyState 2, we need to set responseURL
            // https://github.com/AdguardTeam/Scriptlets/issues/485
            if (state === 2) {
                const { responseURL } = forgedRequest;
                Object.defineProperties(thisArg, {
                    responseURL: { value: responseURL || storedXhrData.url, writable: false },
                });
            }

            if (state === 4) {
                const { responseXML } = forgedRequest;

                // Use the generated responseXML for 'document' responseType,
                // otherwise fall back to the forged request's value (null)
                const finalResponseXML = typeof modifiedResponseXML !== 'undefined'
                    ? modifiedResponseXML
                    : responseXML;

                // Mock response object. Only expose responseText for
                // responseTypes where it is accessible in native XHR.
                // For 'blob', 'arraybuffer', and 'document' the native getter
                // throws InvalidStateError, so we leave it untouched.
                const mockProps: PropertyDescriptorMap = {
                    readyState: { value: 4, writable: false },
                    statusText: { value: 'OK', writable: false },
                    responseXML: { value: finalResponseXML, writable: false },
                    status: { value: 200, writable: false },
                    response: { value: modifiedResponse, writable: false },
                };
                if (exposeResponseText) {
                    mockProps.responseText = { value: modifiedResponseText, writable: false };
                }
                Object.defineProperties(thisArg, mockProps);
                hit(source);
            } else {
                Object.defineProperty(thisArg, 'readyState', {
                    value: state,
                    writable: true,
                    configurable: true,
                });
            }
            const stateEvent = new Event('readystatechange');
            thisArg.dispatchEvent(stateEvent);
        };

        // All events added to avoid problems with anti-adblockers
        // https://github.com/AdguardTeam/Scriptlets/issues/414
        forgedRequest.addEventListener('readystatechange', () => {
            // simulate the lifecycle
            if (matchedXhrRequests.get(thisArg).shouldFireFirstStage) {
                transitionReadyState(1);
            }
            const loadStartEvent = new ProgressEvent('loadstart');
            thisArg.dispatchEvent(loadStartEvent);
            transitionReadyState(2);
            transitionReadyState(3);
            const progressEvent = new ProgressEvent('progress');
            thisArg.dispatchEvent(progressEvent);
            transitionReadyState(4);
        });

        setTimeout(() => {
            const loadEvent = new ProgressEvent('load');
            thisArg.dispatchEvent(loadEvent);
            const loadEndEvent = new ProgressEvent('loadend');
            thisArg.dispatchEvent(loadEndEvent);
        }, 1);

        nativeOpen.apply(forgedRequest, [storedXhrData.method, storedXhrData.url]);

        // Mimic request headers before sending
        // setRequestHeader can only be called on open request objects
        const collectedHeaders = xhrRequestHeaders.get(thisArg) || [];
        collectedHeaders.forEach((header: any) => {
            const name = header[0];
            const value = header[1];
            forgedRequest.setRequestHeader(name, value);
        });
        // Note: We do NOT delete from xhrRequestHeaders here because
        // getResponseHeader() and getAllResponseHeaders() need access to the headers later

        return undefined;
    };

    /**
     * Mock XMLHttpRequest.prototype.getResponseHeader() to avoid adblocker detection.
     *
     * @param target Native `getResponseHeader` method.
     * @param thisArg The request.
     * @param args Header name is passed as first argument.
     *
     * @returns Header value or null if header is not set.
     */
    const getHeaderWrapper = (target: any, thisArg: any, args: any[]): any => {
        const collectedHeaders = xhrRequestHeaders.get(thisArg);
        if (!collectedHeaders) {
            return nativeGetResponseHeader.apply(thisArg, args);
        }
        if (!collectedHeaders.length) {
            return null;
        }
        // The search for the header name is case-insensitive
        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/getResponseHeader
        const searchHeaderName = args[0].toLowerCase();
        const matchedHeader = collectedHeaders.find((header: any) => {
            const headerName = header[0].toLowerCase();
            return headerName === searchHeaderName;
        });
        return matchedHeader
            ? matchedHeader[1]
            : null;
    };

    /**
     * Mock XMLHttpRequest.prototype.getAllResponseHeaders() to avoid adblocker detection.
     *
     * @param target Native `getAllResponseHeaders` method.
     * @param thisArg The request.
     *
     * @returns All headers as a string. For no headers an empty string is returned.
     */
    const getAllHeadersWrapper = (target: any, thisArg: any): any => {
        const collectedHeaders = xhrRequestHeaders.get(thisArg);

        if (!collectedHeaders) {
            return nativeGetAllResponseHeaders.call(thisArg);
        }

        if (!collectedHeaders.length) {
            return '';
        }

        const allHeadersStr = collectedHeaders
            .map((header: any) => {
                /**
                 * TODO: array destructuring may be used here
                 * after the typescript implementation and bundling refactoring
                 * as now there is an error: slicedToArray is not defined
                 */
                const headerName = header[0];
                const headerValue = header[1];
                // In modern browsers, the header names are returned in all lower case, as per the latest spec.
                // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/getAllResponseHeaders
                return `${headerName.toLowerCase()}: ${headerValue}`;
            })
            .join('\r\n');
        return allHeadersStr;
    };

    const openHandler = {
        apply: openWrapper,
    };
    const sendHandler = {
        apply: sendWrapper,
    };
    const getHeaderHandler = {
        apply: getHeaderWrapper,
    };
    const getAllHeadersHandler = {
        apply: getAllHeadersWrapper,
    };

    XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, openHandler);
    XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, sendHandler);
    XMLHttpRequest.prototype.getResponseHeader = new Proxy(
        XMLHttpRequest.prototype.getResponseHeader,
        getHeaderHandler,
    );
    XMLHttpRequest.prototype.getAllResponseHeaders = new Proxy(
        XMLHttpRequest.prototype.getAllResponseHeaders,
        getAllHeadersHandler,
    );
}
