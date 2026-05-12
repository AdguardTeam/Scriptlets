type ReplacementData = {
    body?: string | null;
    type?: string;
    ok?: boolean;
    redirected?: boolean;
    status?: number;
    statusText?: string;
};

type SyntheticResponseData = ReplacementData & {
    headers?: HeadersInit;
    requestUrl?: string;
};

type ResponseConfigData = {
    ok?: boolean;
    redirected?: boolean;
    status?: number;
    statusText?: string;
    type?: string;
};

/**
 * Copies response headers into a plain object accepted by the Response constructor.
 *
 * @param sourceHeaders Headers to copy.
 * @returns Plain headers object.
 */
export const copyResponseHeaders = (sourceHeaders?: Headers): HeadersInit => {
    const headers: HeadersInit = {};

    sourceHeaders?.forEach((value, key) => {
        headers[key] = value;
    });

    return headers;
};

/**
 * Checks whether a response status code is successful.
 *
 * @param status Response status code.
 * @returns `true` if the status code is in the `200..299` range.
 */
export const isSuccessResponseStatus = (status: number): boolean => status >= 200 && status <= 299;

/**
 * Returns a normalized response status code used for the final response shape.
 *
 * @param status Response status code.
 * @returns Status code in the `0..599` range or `200` for invalid values.
 */
export const getSafeResponseStatus = (status: number | undefined): number => {
    if (typeof status === 'number' && status >= 0 && status <= 599) {
        return status;
    }

    return 200;
};

/**
 * Checks whether a value is a valid response status override.
 *
 * @param value Status value to validate.
 * @returns `true` if the value is an integer in the `0..599` range.
 */
export const isValidResponseStatus = (value: unknown): boolean => {
    const isInteger = typeof value === 'number' && Number.isFinite(value) && Math.floor(value) === value;

    // `0` is used for filtered responses, may be useful when
    // response type is set to `error`, `opaque` or `opaqueredirect`.
    // While regular HTTP statuses stay within `100..599`.
    // Values above `599` are outside the standard HTTP status code space.
    return isInteger && value >= 0 && value <= 599;
};

/**
 * Parses a raw response config argument into normalized response overrides.
 *
 * @param value Raw response config string.
 * @param onInvalid Optional callback for invalid values.
 * @returns Parsed response config, `undefined` when omitted, or `null` when invalid.
 */
export const parseResponseConfig = (
    value?: string,
    onInvalid?: (invalidValue: unknown) => void,
): ResponseConfigData | null | undefined => {
    const reportInvalid = (): null => {
        if (typeof onInvalid === 'function') {
            onInvalid(value);
        }

        return null;
    };
    const supportedResponseTypes = new Set([
        'basic',
        'cors',
        'error',
        'opaque',
        'opaqueredirect',
    ]);
    const supportedStatusTexts = new Set([
        '',
        'OK',
        'Continue',
        'Not Found',
    ]);

    if (typeof value === 'undefined') {
        return undefined;
    }

    if (supportedResponseTypes.has(value)) {
        return {
            type: value,
        };
    }

    const trimmedResponseConfig = value.trim();
    if (!trimmedResponseConfig.startsWith('{') || !trimmedResponseConfig.endsWith('}')) {
        return reportInvalid();
    }

    let parsedResponseConfig;
    try {
        parsedResponseConfig = JSON.parse(trimmedResponseConfig);
    } catch {
        return reportInvalid();
    }

    if (
        !parsedResponseConfig
        || Array.isArray(parsedResponseConfig)
        || typeof parsedResponseConfig !== 'object'
    ) {
        return reportInvalid();
    }

    const normalizedResponseConfig: ResponseConfigData = {};
    const responseConfigKeys = Object.keys(parsedResponseConfig);

    for (let i = 0; i < responseConfigKeys.length; i += 1) {
        const key = responseConfigKeys[i];
        const parsedValue = parsedResponseConfig[key];

        if ((key === 'ok' || key === 'redirected') && typeof parsedValue === 'boolean') {
            normalizedResponseConfig[key] = parsedValue;
            continue;
        }

        if (key === 'status' && isValidResponseStatus(parsedValue)) {
            normalizedResponseConfig[key] = parsedValue;
            continue;
        }

        if (
            key === 'statusText'
            && typeof parsedValue === 'string'
            && supportedStatusTexts.has(parsedValue)
        ) {
            normalizedResponseConfig[key] = parsedValue;
            continue;
        }

        if (
            key === 'type'
            && typeof parsedValue === 'string'
            && supportedResponseTypes.has(parsedValue)
        ) {
            normalizedResponseConfig[key] = parsedValue;
            continue;
        }

        return reportInvalid();
    }

    return normalizedResponseConfig;
};

/**
 * Merges parsed response config with a fallback response type.
 *
 * @param parsedConfig Parsed response config.
 * @param fallbackType Response type inferred from the request.
 * @returns Resolved response config.
 */
export const getResolvedResponseConfig = (
    parsedConfig?: ResponseConfigData | null,
    fallbackType?: string,
): ResponseConfigData => {
    const resolvedResponseConfig: ResponseConfigData = {};

    if (typeof fallbackType !== 'undefined') {
        resolvedResponseConfig.type = fallbackType;
    }

    if (typeof parsedConfig === 'undefined' || parsedConfig === null) {
        return resolvedResponseConfig;
    }

    return Object.assign(resolvedResponseConfig, parsedConfig);
};

/**
 * Defines readonly response properties on a response object.
 *
 * @param response Response to patch.
 * @param props Property overrides to define.
 */
export const defineReadonlyResponseProps = (
    response: Response,
    props: ReplacementData & { url?: string },
): void => {
    const descriptors: PropertyDescriptorMap = {};

    if (typeof props.body !== 'undefined' && props.body === null && response.body !== null) {
        descriptors.body = { value: null };
    }
    if (typeof props.status !== 'undefined' && response.status !== props.status) {
        descriptors.status = { value: props.status };
    }
    if (typeof props.statusText !== 'undefined' && response.statusText !== props.statusText) {
        descriptors.statusText = { value: props.statusText };
    }
    if (typeof props.url !== 'undefined' && response.url !== props.url) {
        descriptors.url = { value: props.url };
    }
    if (typeof props.type !== 'undefined' && response.type !== props.type) {
        descriptors.type = { value: props.type };
    }
    if (typeof props.ok !== 'undefined' && response.ok !== props.ok) {
        descriptors.ok = { value: props.ok };
    }
    if (typeof props.redirected !== 'undefined' && response.redirected !== props.redirected) {
        descriptors.redirected = { value: props.redirected };
    }

    if (Object.keys(descriptors).length > 0) {
        Object.defineProperties(response, descriptors);
    }
};

/**
 * Returns default response properties for filtered response types.
 *
 * These defaults emulate what fetch exposes for filtered responses:
 * no readable body, `ok === false`, `status === 0`, empty `statusText`, and an empty URL.
 *
 * @param type Response type.
 * @returns Filtered response defaults for `opaque`, `error`, and
 * `opaqueredirect`, or an empty object for other response types.
 */
export const getFilteredResponseDefaults = (type?: string): ReplacementData & { url?: string } => {
    if (type !== 'opaque' && type !== 'error' && type !== 'opaqueredirect') {
        return {};
    }

    return {
        body: null,
        ok: false,
        status: 0,
        statusText: '',
        url: '',
    };
};

/**
 * Modifies original response with the given replacement data.
 *
 * @param origResponse Original response.
 * @param replacement Replacement data for response with possible keys:
 * - `body`: optional, string, default to '{}';
 * - `type`: optional, string, original response type is used if not specified.
 *
 * @returns Modified response.
 */
export const modifyResponse = (
    origResponse: Response,
    replacement: ReplacementData = {
        body: '{}',
    },
): Response => {
    const body = typeof replacement.body === 'undefined' ? '{}' : replacement.body;
    const type = typeof replacement.type === 'undefined' ? origResponse.type : replacement.type;
    const filteredDefaults = getFilteredResponseDefaults(type);
    const finalBody = typeof filteredDefaults.body === 'undefined' ? body : filteredDefaults.body;
    let status = replacement.status;
    if (typeof status === 'undefined') {
        status = typeof filteredDefaults.status === 'undefined' ? origResponse.status : filteredDefaults.status;
    }
    let statusText = replacement.statusText;
    if (typeof statusText === 'undefined') {
        statusText = typeof filteredDefaults.statusText === 'undefined'
            ? origResponse.statusText
            : filteredDefaults.statusText;
    }
    let ok = replacement.ok;
    if (typeof ok === 'undefined') {
        ok = typeof replacement.status === 'undefined' && typeof filteredDefaults.ok === 'undefined'
            ? origResponse.ok
            : isSuccessResponseStatus(status);
    }
    const redirected = typeof replacement.redirected === 'undefined'
        ? origResponse.redirected
        : replacement.redirected;
    let url = filteredDefaults.url;
    if (typeof url === 'undefined') {
        url = origResponse.url;
    }
    const isFilteredResponse = typeof filteredDefaults.body !== 'undefined';
    const headers = isFilteredResponse ? {} : copyResponseHeaders(origResponse?.headers);
    const safeStatus = getSafeResponseStatus(status);
    // Response init rejects statuses below 200, so construct safely and patch the final exposed status after.
    const responseInitStatus = safeStatus < 200 ? 200 : safeStatus;

    const modifiedResponse = new Response(finalBody, {
        status: responseInitStatus,
        statusText,
        headers,
    });

    defineReadonlyResponseProps(modifiedResponse, {
        body: finalBody,
        ok,
        redirected,
        status,
        statusText,
        type,
        url,
    });

    return modifiedResponse;
};

/**
 * Creates a synthetic Response object using the provided response data.
 *
 * @param responseData replacement data for response.
 *
 * @returns Synthetic response.
 */
export const createResponse = (
    responseData: SyntheticResponseData = {
        body: '{}',
    },
): Response => {
    const body = typeof responseData.body === 'undefined' ? '{}' : responseData.body;
    const filteredDefaults = getFilteredResponseDefaults(responseData.type);
    const finalBody = typeof filteredDefaults.body === 'undefined' ? body : filteredDefaults.body;
    let status = responseData.status;
    if (typeof status === 'undefined') {
        status = typeof filteredDefaults.status === 'undefined' ? 200 : filteredDefaults.status;
    }
    let statusText = responseData.statusText;
    if (typeof statusText === 'undefined') {
        statusText = typeof filteredDefaults.statusText === 'undefined' ? 'OK' : filteredDefaults.statusText;
    }
    let ok = responseData.ok;
    if (typeof ok === 'undefined') {
        ok = typeof responseData.status === 'undefined' && typeof filteredDefaults.ok === 'undefined'
            ? true
            : isSuccessResponseStatus(status);
    }
    const redirected = typeof responseData.redirected === 'undefined' ? false : responseData.redirected;
    const type = typeof responseData.type === 'undefined' ? 'basic' : responseData.type;
    let url = filteredDefaults.url;
    if (typeof url === 'undefined') {
        url = typeof responseData.requestUrl === 'undefined' ? '' : responseData.requestUrl;
    }
    const isFilteredResponse = typeof filteredDefaults.body !== 'undefined';
    let headers = responseData.headers;
    if (isFilteredResponse) {
        // Filtered responses such as `Response.error()` and
        // `fetch(..., { mode: 'no-cors' })` expose an empty header list,
        // so synthetic filtered responses must ignore any caller-supplied headers.
        headers = {};
    } else if (typeof headers === 'undefined') {
        headers = {
            'Content-Length': body === null ? '0' : String(new TextEncoder().encode(body).length),
        };
    }
    const safeStatus = getSafeResponseStatus(status);
    // Response init rejects statuses below 200, so construct safely and patch the final exposed status after.
    const responseInitStatus = safeStatus < 200 ? 200 : safeStatus;

    const response = new Response(finalBody, {
        headers,
        status: responseInitStatus,
        statusText,
    });

    defineReadonlyResponseProps(response, {
        body: finalBody,
        ok,
        redirected,
        status,
        statusText,
        type,
        url,
    });

    return response;
};

/**
 * Create new Response object using original response' properties
 * and given text as body content
 *
 * @param response original response to copy properties from
 * @param textContent text to set as body content
 */
export const forgeResponse = (response: Response, textContent: string): Response => {
    const {
        bodyUsed,
        headers,
        ok,
        redirected,
        status,
        statusText,
        type,
        url,
    } = response;

    const forgedResponse = new Response(textContent, {
        status,
        statusText,
        headers,
    });

    // Manually set properties which can't be set by Response constructor
    Object.defineProperties(forgedResponse, {
        url: { value: url },
        type: { value: type },
        ok: { value: ok },
        bodyUsed: { value: bodyUsed },
        redirected: { value: redirected },
    });

    return forgedResponse;
};
