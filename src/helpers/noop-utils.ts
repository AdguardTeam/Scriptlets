/**
 * Noop function
 */
export const noopFunc: NoopFunc = () => { };

/**
 * Function returns noopFunc
 *
 * @returns noopFunc
 */
export const noopCallbackFunc = (): NoopFunc => noopFunc;

/**
 * Function returns null
 *
 * @returns null
 */
export const noopNull = () => null;

/**
 * Function returns true
 *
 * @returns true
 */
export const trueFunc: TrueFunc = () => true;

/**
 * Function returns false
 *
 * @returns false
 */
export const falseFunc = () => false;

/**
 * Function returns this
 *
 * @returns this object
 */
export function noopThis() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this;
}

/**
 * Function returns empty string
 *
 * @returns empty string
 */
export const noopStr = (): string => '';

/**
 * Function returns empty array
 *
 * @returns empty array
 */
export const noopArray = (): Array<void> => [];

/**
 * Function returns empty object
 *
 * @returns empty object
 */
export const noopObject = (): Record<string, void> => ({});

/**
 * Function throws an error
 *
 * @throws
 */
export const throwFunc = (): void => {
    throw new Error();
};

/**
 * Function returns Promise.reject()
 *
 * @returns rejected Promise
 */
export const noopPromiseReject = (): Promise<never> => Promise.reject();

/**
 * Returns Promise object that is resolved with specified props
 *
 * @param responseBody value to set as responseBody
 * @param responseUrl value to set as responseUrl
 * @param responseType value to set as responseType
 * @returns resolved Promise or undefined if Response interface is not available
 */
export const noopPromiseResolve = (
    responseBody = '{}',
    responseUrl = '',
    responseType = 'default',
): Promise<Response> | undefined => {
    if (typeof Response === 'undefined') {
        return;
    }

    const response = new Response(responseBody, {
        status: 200,
        statusText: 'OK',
    });

    // Mock response' url & type to avoid adb checks
    // https://github.com/AdguardTeam/Scriptlets/issues/216
    Object.defineProperties(response, {
        url: { value: responseUrl },
        type: { value: responseType },
    });

    // In the case if responseType is opaque
    // mock response' body, status & statusText to avoid adb checks
    // https://github.com/AdguardTeam/Scriptlets/issues/364
    if (responseType === 'opaque') {
        Object.defineProperties(response, {
            body: { value: null },
            status: { value: 0 },
            statusText: { value: '' },
        });
    }

    // eslint-disable-next-line consistent-return
    return Promise.resolve(response);
};
