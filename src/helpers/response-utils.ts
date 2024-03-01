type ReplacementData = {
    body: string;
    type?: string;
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
    const headers: HeadersInit = {};
    origResponse?.headers?.forEach((value, key) => {
        headers[key] = value;
    });

    const modifiedResponse = new Response(replacement.body, {
        status: origResponse.status,
        statusText: origResponse.statusText,
        headers,
    });

    // Mock response url and type to avoid adblocker detection
    // https://github.com/AdguardTeam/Scriptlets/issues/216
    Object.defineProperties(modifiedResponse, {
        url: {
            value: origResponse.url,
        },
        type: {
            value: replacement.type || origResponse.type,
        },
    });

    return modifiedResponse;
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
