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
