import { getThrownValueMessage } from './get-error-message';
import { logMessage } from './log-message';
import { addStackTraceMessageLine, isValidStackPattern, matchStackTrace } from './match-stack';
import { getFunctionProxyProperty } from './object-utils';
import { getXhrData, type XMLHttpRequestSharedRequestData } from './request-utils';
import { type Source } from '../scriptlets';

/**
 * Sends a forged request instead of each request of an `XMLHttpRequest` object of the page which is matched
 * by `isRequestMatched()` and `stack`, and defines its response, modified by `modifyResponse()`, on the object
 * of the page, which is not sent itself. Shared core of `json-prune-xhr-response`
 * and `trusted-json-set-xhr-response`.
 *
 * The page may reuse the object for the next request, so the state of the previous one is reset
 * when the object is opened again, as `open()` does it for a native request:
 * the request is matched again, the headers set for the previous one are not sent with it,
 * the forged request of the previous one is aborted, if it is still in flight, and the events of its response
 * are not dispatched, if they have not been yet, and the props of its response are removed,
 * so the native ones are used again, unless the request is matched as well, and `readystatechange` is dispatched,
 * as by `open()` of a native object which is done. `abort()` aborts the forged request in the same way,
 * and dispatches the events of an aborted request, as the object of the page has not been sent,
 * so the native method does not do it. Events of the response of a synchronous request are dispatched
 * before `send()` returns, as by a native one.
 *
 * Headers are collected by the hook of `XMLHttpRequest.prototype.setRequestHeader`, and by a wrapper
 * of another method of a matched object, e.g. its own one, which may call the native method saved by the page
 * before the scriptlet has run. Each method is wrapped once, and only the outermost wrapper collects a header.
 * The headers of the forged response are returned by the hooks of `getResponseHeader()`
 * and `getAllResponseHeaders()` of the prototype, but other methods of the object are not wrapped for them,
 * as a method of the page may return no headers on purpose, e.g. to hide one.
 *
 * The forged request is opened with the arguments of `open()` of the page, so e.g. a request opened
 * without `async` is sent asynchronously, and it is sent once, so its error, e.g. a network error
 * of a synchronous request, is thrown to the page, and the request is not sent again.
 *
 * @param source scriptlet properties
 * @param stack string or regular expression which the stack trace of `send()` must match,
 * or an empty string to match all requests
 * @param shouldReadStackTrace whether the stack trace should be read for logs, even without `stack`
 * @param isRequestMatched function which checks the data of `open()` of the request
 * @param modifyResponse function which returns the content of the response for the object of the page,
 * converted to its `responseType`, for the text of the forged response, the object of the page,
 * and the stack trace of `send()`, which is empty if it is not read
 */
export function interceptXhrResponses(
    source: Source,
    stack: string,
    shouldReadStackTrace: boolean,
    isRequestMatched: (xhrData: XMLHttpRequestSharedRequestData<any>) => boolean,
    modifyResponse: (content: any, xhr: XMLHttpRequest, stackTrace: string) => unknown,
): void {
    /**
     * Request of the page which is matched, with the arguments of its `open()`, to open the forged request
     * in the same way, and the headers set for it.
     */
    type MatchedRequest = {
        openArgs: unknown[];
        headers: unknown[][];
    };

    /**
     * Forged request sent instead of the request of the page. It is kept only while it is in flight,
     * so the original response is not kept alive while the page keeps the object,
     * and `isFinished` is set once the events of its response are dispatched or cancelled.
     * `responseHeaders` are the headers of its response, as returned by `getAllResponseHeaders()`,
     * once the response is defined on the object of the page, until it is aborted.
     */
    type ForgedRequest = {
        request: XMLHttpRequest | null;
        isFinished: boolean;
        responseHeaders: string | null;
    };

    // `matchStackTrace()` throws for `stack` which is an invalid regular expression, so such rule is not applied,
    // which is logged once, instead of on each request
    if (stack && !isValidStackPattern(stack)) {
        logMessage(source, `Invalid stack: ${stack}`);
        return;
    }

    // Constructor is saved as well, as the page may replace it, e.g. by a library which wraps requests,
    // so its objects would not be native ones, for which the saved native methods throw
    const NativeXMLHttpRequest = window.XMLHttpRequest;
    const nativeOpen = window.XMLHttpRequest.prototype.open;
    const nativeSend = window.XMLHttpRequest.prototype.send;
    const nativeSetRequestHeader = window.XMLHttpRequest.prototype.setRequestHeader;
    const nativeGetResponseHeader = window.XMLHttpRequest.prototype.getResponseHeader;
    const nativeGetAllResponseHeaders = window.XMLHttpRequest.prototype.getAllResponseHeaders;
    const nativeAbort = window.XMLHttpRequest.prototype.abort;

    // Props of the response which are defined on the object of the page, as they are removed
    // when the object is opened again
    const RESPONSE_PROPS = [
        'readyState',
        'responseURL',
        'responseXML',
        'status',
        'statusText',
        'response',
        'responseText',
    ];

    const matchedRequests = new WeakMap<XMLHttpRequest, MatchedRequest>();
    const forgedRequests = new WeakMap<XMLHttpRequest, ForgedRequest>();

    /**
     * Defines the props of the response on the object of the page, as it is not sent itself,
     * and they cannot be set otherwise. They are configurable, so they can be removed
     * when the object is opened again.
     *
     * @param xhr object of the page
     * @param values values of the props, by their names
     */
    const defineResponseProps = (xhr: XMLHttpRequest, values: Record<string, unknown>) => {
        const descriptors: PropertyDescriptorMap = {};
        RESPONSE_PROPS.forEach((prop) => {
            descriptors[prop] = { value: values[prop], writable: false, configurable: true };
        });
        Object.defineProperties(xhr, descriptors);
    };

    /**
     * Defines the props of a network error on the object of the page, i.e. of the response of a request
     * which is aborted or failed, e.g. a synchronous request with a network error.
     *
     * @param xhr object of the page
     * @param readyState `4` for a failed request, or while the events of an aborted request are dispatched,
     * and `0` after that
     */
    const defineNetworkErrorProps = (xhr: XMLHttpRequest, readyState: number) => {
        const { responseType } = xhr;
        defineResponseProps(xhr, {
            readyState,
            responseURL: '',
            responseXML: null,
            status: 0,
            statusText: '',
            response: responseType === '' || responseType === 'text' ? '' : null,
            responseText: '',
        });
    };

    /**
     * Aborts the forged request, if it is still in flight, and cancels the events of its response,
     * if they have not been dispatched yet. Its request is released before it is aborted,
     * so the `readystatechange` event which aborting fires is ignored.
     *
     * @param forgedRequest forged request to cancel
     */
    const cancelForgedRequest = (forgedRequest: ForgedRequest): void => {
        const { request } = forgedRequest;
        forgedRequest.request = null;
        forgedRequest.isFinished = true;
        // Its `readyState` is `4` after an error, e.g. a network error of a synchronous request,
        // or if the response is not processed
        if (request && request.readyState !== 4) {
            Reflect.apply(nativeAbort, request, []);
        }
    };

    // Objects of the page whose header is being set, so it is recorded only by the outermost wrapper,
    // e.g. by the one of the method of the object, and not by the hook of the prototype which it calls
    const objectsSettingHeader = new Set<unknown>();

    const setRequestHeaderWrapper = (
        target: typeof XMLHttpRequest.prototype.setRequestHeader,
        thisArg: XMLHttpRequest,
        args: [name: string, value: string],
    ): unknown => {
        if (objectsSettingHeader.has(thisArg)) {
            return Reflect.apply(target, thisArg, args);
        }

        // Native method is called first, so only the headers which it sets are sent with the forged request,
        // e.g. not the ones with an invalid name, for which it throws.
        // Its result is returned, as a method of the page may return e.g. the object, to chain the calls
        let result;
        objectsSettingHeader.add(thisArg);
        try {
            result = Reflect.apply(target, thisArg, args);
        } finally {
            objectsSettingHeader.delete(thisArg);
        }

        const matchedRequest = matchedRequests.get(thisArg);
        if (matchedRequest) {
            matchedRequest.headers.push(args);
        }
        return result;
    };

    const setRequestHeaderHandler = { apply: setRequestHeaderWrapper, get: getFunctionProxyProperty };

    /**
     * Returns the headers of the forged response of the object of the page, if it has one.
     *
     * @param xhr object of the page
     * @returns headers as returned by `getAllResponseHeaders()`, or null if the object has no forged response
     */
    const getForgedResponseHeaders = (xhr: unknown): string | null => {
        const forgedRequest = forgedRequests.get(xhr as XMLHttpRequest);
        return forgedRequest ? forgedRequest.responseHeaders : null;
    };

    /**
     * Returns the value of the header from the headers returned by `getAllResponseHeaders()`,
     * whose names are lowercase, and whose values are combined for the same name,
     * as `getResponseHeader()` returns them.
     *
     * @param responseHeaders headers as returned by `getAllResponseHeaders()`
     * @param name name of the header
     * @returns value of the header, or null if there is no such header
     */
    const getResponseHeaderValue = (responseHeaders: string, name: unknown): string | null => {
        const HEADERS_SEPARATOR = '\r\n';
        const NAME_SEPARATOR = ': ';
        const headerName = String(name).toLowerCase();
        const headers = responseHeaders.split(HEADERS_SEPARATOR);
        for (let i = 0; i < headers.length; i += 1) {
            const header = headers[i];
            const separatorIndex = header.indexOf(NAME_SEPARATOR);
            if (separatorIndex !== -1 && header.slice(0, separatorIndex).toLowerCase() === headerName) {
                return header.slice(separatorIndex + NAME_SEPARATOR.length);
            }
        }
        return null;
    };

    // Hooks of the prototype call the native methods first, so their errors, e.g. for a missing argument,
    // are thrown to the page as is. Only the result which the object returns as it has not been sent,
    // i.e. no headers, is replaced, as the hook may wrap another one, e.g. of another rule, which returns headers
    const getResponseHeaderWrapper = (
        target: typeof XMLHttpRequest.prototype.getResponseHeader,
        thisArg: XMLHttpRequest,
        args: [name: string],
    ): unknown => {
        const result = Reflect.apply(target, thisArg, args);
        const responseHeaders = getForgedResponseHeaders(thisArg);
        if (result !== null || responseHeaders === null) {
            return result;
        }
        return getResponseHeaderValue(responseHeaders, args[0]);
    };

    const getAllResponseHeadersWrapper = (
        target: typeof XMLHttpRequest.prototype.getAllResponseHeaders,
        thisArg: XMLHttpRequest,
        args: [],
    ): unknown => {
        const result = Reflect.apply(target, thisArg, args);
        const responseHeaders = getForgedResponseHeaders(thisArg);
        if (result !== '' || responseHeaders === null) {
            return result;
        }
        return responseHeaders;
    };

    const getResponseHeaderHandler = { apply: getResponseHeaderWrapper, get: getFunctionProxyProperty };
    const getAllResponseHeadersHandler = { apply: getAllResponseHeadersWrapper, get: getFunctionProxyProperty };

    // Methods which handle headers are hooked for all objects in the prototype, so it is done once,
    // and wrappers of other methods of the objects which set headers are created only once as well,
    // as a wrapper created for each request of a reused object wrapped the previous one,
    // so the headers were sent multiple times
    const setRequestHeaderHook = new Proxy<typeof nativeSetRequestHeader>(
        nativeSetRequestHeader,
        setRequestHeaderHandler,
    );
    const getResponseHeaderHook = new Proxy<typeof nativeGetResponseHeader>(
        nativeGetResponseHeader,
        getResponseHeaderHandler,
    );
    const getAllResponseHeadersHook = new Proxy<typeof nativeGetAllResponseHeaders>(
        nativeGetAllResponseHeaders,
        getAllResponseHeadersHandler,
    );
    const setRequestHeaderWrappers = new WeakSet<Function>([setRequestHeaderHook]);

    // Objects of the page whose method has been wrapped, as it is wrapped only once for each object.
    // Wrappers of another rule are not recognized, so with two rules, each of them would wrap the wrapper
    // of the other one again whenever a reused object is opened, so the method would be wrapped deeper
    // for each request
    const objectsWithWrappedMethod = new WeakSet<XMLHttpRequest>();

    /**
     * Wraps the method which sets headers of the object of the page, if it is not the hook of the prototype,
     * e.g. its own method, or one of a subclass, which may call the native method saved before the scriptlet
     * has run, instead of the hook, so the headers set by it are collected as well.
     * It is done once for each object, when it is opened for a matched request for the first time.
     *
     * Methods which return response headers are not wrapped, as a method of the page may return no headers
     * on purpose, e.g. to hide one, which a wrapper could not tell apart from the result of the object
     * which has not been sent, so it would return the headers of the forged response instead.
     *
     * @param xhr object of the page
     */
    const wrapSetRequestHeader = (xhr: XMLHttpRequest) => {
        if (objectsWithWrappedMethod.has(xhr)) {
            return;
        }
        objectsWithWrappedMethod.add(xhr);

        // The method may be a getter of the page which throws, or it may be not writable,
        // which should not stop the object from being opened, so it is not wrapped then
        try {
            const { setRequestHeader } = xhr;
            if (typeof setRequestHeader !== 'function' || setRequestHeaderWrappers.has(setRequestHeader)) {
                return;
            }

            const methodWrapper = new Proxy<typeof setRequestHeader>(setRequestHeader, setRequestHeaderHandler);
            setRequestHeaderWrappers.add(methodWrapper);
            xhr.setRequestHeader = methodWrapper;
        } catch {
            // Method is not wrapped
        }
    };

    const openWrapper = (
        target: typeof XMLHttpRequest.prototype.open,
        thisArg: XMLHttpRequest,
        args: [
            method: string,
            url: string,
            async?: boolean,
            user?: string,
            password?: string,
        ],
    ): void => {
        const previousMatchedRequest = matchedRequests.get(thisArg);
        const previousForgedRequest = forgedRequests.get(thisArg);

        // The request is matched before the object is opened, as `open()` may fire `readystatechange`
        // synchronously, e.g. for a new object, and its listener may send the request before `open()` returns
        // eslint-disable-next-line prefer-spread
        const xhrData: XMLHttpRequestSharedRequestData<any> = getXhrData.apply(null, args);
        if (isRequestMatched(xhrData)) {
            matchedRequests.set(thisArg, { openArgs: args, headers: [] });
            wrapSetRequestHeader(thisArg);
        } else {
            matchedRequests.delete(thisArg);
        }

        let isOpened = false;
        try {
            Reflect.apply(target, thisArg, args);
            isOpened = true;
        } finally {
            // `open()` may throw, e.g. for an invalid URL, and the object keeps its state then,
            // so the previous request is kept as well
            if (!isOpened) {
                if (previousMatchedRequest) {
                    matchedRequests.set(thisArg, previousMatchedRequest);
                } else {
                    matchedRequests.delete(thisArg);
                }
            }
        }

        if (!previousForgedRequest) {
            return;
        }

        cancelForgedRequest(previousForgedRequest);
        // The props are not removed if the request has been forged again during `open()`,
        // so its response, e.g. of a synchronous request, is kept
        if (forgedRequests.get(thisArg) === previousForgedRequest) {
            forgedRequests.delete(thisArg);
            // The object is done or aborted for the page if it has the props of a response, while its native state
            // is still opened, as it has not been sent, so `open()` does not fire `readystatechange`,
            // which it fires for a native object which is not opened, so it is dispatched instead
            const hasResponseProps = !!Reflect.getOwnPropertyDescriptor(thisArg, 'readyState');
            RESPONSE_PROPS.forEach((prop) => {
                Reflect.deleteProperty(thisArg, prop);
            });
            if (hasResponseProps) {
                const stateEvent = new Event('readystatechange');
                thisArg.dispatchEvent(stateEvent);
            }
        }
    };

    const sendWrapper = (
        target: typeof XMLHttpRequest.prototype.send,
        thisArg: XMLHttpRequest,
        args: any,
    ): void => {
        const matchedRequest = matchedRequests.get(thisArg);
        if (!matchedRequest) {
            return Reflect.apply(target, thisArg, args);
        }
        matchedRequests.delete(thisArg);

        // Stack trace is read only if it is matched or logged.
        // The page may make creating or reading it throw, e.g. by replacing `Error` or by `Error.prepareStackTrace`,
        // which should not stop the rules without `stack` from working, so it is done separately
        let stackTrace = '';
        let isStackTraceRead = false;
        if (stack || shouldReadStackTrace) {
            try {
                stackTrace = String(new Error().stack || '');
                isStackTraceRead = true;
            } catch {
                // Rules with `stack` are not applied, as it cannot be matched
            }
        }

        // Error message line is added to the stack trace created here, in the wrapper called by the page,
        // as Firefox and Safari do not have it, so `matchStackTrace()` keeps the frame of the caller
        if (stack && (!isStackTraceRead || !matchStackTrace(stack, addStackTraceMessageLine(stackTrace)))) {
            return Reflect.apply(target, thisArg, args);
        }

        /**
         * Create separate XHR request with original request's input
         * to be able to collect response data without triggering
         * listeners on original XHR object
         */
        const request = new NativeXMLHttpRequest();
        request.withCredentials = thisArg.withCredentials;
        const forgedRequest: ForgedRequest = { request, isFinished: false, responseHeaders: null };

        // `async` is `true` if it is omitted, but `false` if it is `undefined`, as by `open()`
        const { openArgs } = matchedRequest;
        const isAsync = openArgs.length < 3 || Boolean(openArgs[2]);

        // Values of the last `progress` event, which an asynchronous request fires right before its response
        // is complete, with the same values as its `load` and `loadend` events
        let progress: ProgressEventInit = { lengthComputable: false, loaded: 0, total: 0 };
        request.addEventListener('progress', (event) => {
            const { lengthComputable, loaded, total } = event;
            progress = { lengthComputable, loaded, total };
        });

        request.addEventListener('readystatechange', () => {
            if (forgedRequest.request !== request || request.readyState !== 4) {
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
            } = request;

            // Extract content from response
            const content = responseText || response;
            if (typeof content !== 'string' && typeof content !== 'object') {
                return;
            }

            // The response is delivered to the page even if it cannot be modified, e.g. as logging content
            // which is too deeply nested throws, so the request of the page does not wait for it forever.
            // The original text of the response is returned then
            let modifiedContent;
            try {
                modifiedContent = modifyResponse(content, thisArg, stackTrace);
            } catch (error) {
                logMessage(source, `Response cannot be modified: ${getThrownValueMessage(error)}`);
                modifiedContent = content;
            }
            // Headers are read before the request is released, as the object of the page has none
            forgedRequest.responseHeaders = Reflect.apply(nativeGetAllResponseHeaders, request, []);
            forgedRequest.request = null;

            // The props may not be defined, e.g. if another scriptlet has defined them as not configurable
            // on a reused object, but the events are dispatched anyway, so the page does not wait for them
            try {
                defineResponseProps(thisArg, {
                    // original values
                    readyState,
                    responseURL,
                    responseXML,
                    status,
                    statusText,
                    // modified values
                    response: modifiedContent,
                    responseText: modifiedContent,
                });
            } catch (error) {
                logMessage(source, `Response cannot be defined: ${getThrownValueMessage(error)}`);
            }

            // Mock events. They are not dispatched if the request has been cancelled before,
            // e.g. as the object has been opened again, but once they are, `load` and `loadend` are dispatched
            // after `readystatechange` even if its listener opens the object again or aborts it,
            // as in the specification and in Firefox, as the page may wait for them,
            // although Chromium-based browsers do not dispatch them then
            const dispatchResponseEvents = () => {
                if (forgedRequest.isFinished) {
                    return;
                }
                forgedRequest.isFinished = true;

                const stateEvent = new Event('readystatechange');
                thisArg.dispatchEvent(stateEvent);

                const loadEvent = new ProgressEvent('load', progress);
                thisArg.dispatchEvent(loadEvent);

                const loadEndEvent = new ProgressEvent('loadend', progress);
                thisArg.dispatchEvent(loadEndEvent);
            };

            // Events of a synchronous request are dispatched before `send()` returns, as by a native one,
            // so the page can use the response right after it, and they are not lost if it opens the object
            // again then, which would cancel the deferred events
            if (isAsync) {
                setTimeout(dispatchResponseEvents, 1);
            } else {
                dispatchResponseEvents();
            }
        });

        Reflect.apply(nativeOpen, request, openArgs);

        // Mimic request headers before sending
        // setRequestHeader can only be called on open request objects
        matchedRequest.headers.forEach((header) => {
            Reflect.apply(nativeSetRequestHeader, request, header);
        });

        // It is set before the request is sent, as the response of a synchronous request is defined
        // before `send()` returns
        forgedRequests.set(thisArg, forgedRequest);

        // Request is sent once, not in a `try` whose `catch` sends it again, so its error, e.g. a network error
        // of a synchronous request, is thrown to the page as is, and the request is not sent again.
        // No events are dispatched for it then, as for a native one, also if the page aborts it
        let isSent = false;
        try {
            Reflect.apply(nativeSend, request, args);
            isSent = true;
        } finally {
            if (!isSent) {
                forgedRequest.isFinished = true;
                forgedRequest.request = null;
                // The object of the page is done with the network error then, as a native one,
                // while it would be still opened otherwise, as it has not been sent.
                // It is done only if the forged request is done, i.e. it has failed, not if it has not been sent.
                // An error of defining it should not replace the error of the request
                if (request.readyState === 4) {
                    try {
                        defineNetworkErrorProps(thisArg, 4);
                    } catch {
                        // Object keeps its state
                    }
                }
            }
        }
        return undefined;
    };

    const abortWrapper = (
        target: typeof XMLHttpRequest.prototype.abort,
        thisArg: XMLHttpRequest,
        args: [],
    ): void => {
        Reflect.apply(target, thisArg, args);

        const forgedRequest = forgedRequests.get(thisArg);
        if (!forgedRequest) {
            return;
        }

        // Events of an aborted request are dispatched if the page has not received the events of the response,
        // i.e. while the request is in flight, or while its response is already defined on the object,
        // but its events are deferred, as for a native request which is in flight, as the page may wait for them
        const hasPendingEvents = !forgedRequest.isFinished;
        cancelForgedRequest(forgedRequest);
        // The response of an aborted request has no headers, as the object of the page then
        forgedRequest.responseHeaders = null;

        if (hasPendingEvents) {
            defineNetworkErrorProps(thisArg, 4);

            const stateEvent = new Event('readystatechange');
            thisArg.dispatchEvent(stateEvent);

            // Progress events of an aborted request have zero length, as the native ones
            const abortEvent = new ProgressEvent('abort');
            thisArg.dispatchEvent(abortEvent);

            const loadEndEvent = new ProgressEvent('loadend');
            thisArg.dispatchEvent(loadEndEvent);
        }

        // The object is reset to the initial state, as a native one which is done, i.e. without events,
        // unless it has been opened again, e.g. by a listener of the events
        if (forgedRequests.get(thisArg) === forgedRequest) {
            defineNetworkErrorProps(thisArg, 0);
        }
    };

    XMLHttpRequest.prototype.open = new Proxy(
        XMLHttpRequest.prototype.open,
        { apply: openWrapper, get: getFunctionProxyProperty },
    );
    XMLHttpRequest.prototype.send = new Proxy(
        XMLHttpRequest.prototype.send,
        { apply: sendWrapper, get: getFunctionProxyProperty },
    );
    XMLHttpRequest.prototype.setRequestHeader = setRequestHeaderHook;
    XMLHttpRequest.prototype.getResponseHeader = getResponseHeaderHook;
    XMLHttpRequest.prototype.getAllResponseHeaders = getAllResponseHeadersHook;
    XMLHttpRequest.prototype.abort = new Proxy(
        XMLHttpRequest.prototype.abort,
        { apply: abortWrapper, get: getFunctionProxyProperty },
    );
}
