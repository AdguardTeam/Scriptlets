type ErrorWithMessage = {
    message: string;
};

/**
 * Converts error object to error with message. This method might be helpful to handle thrown errors.
 *
 * @param error Error object.
 *
 * @returns Message of the error.
 */
export const getErrorMessage = (error: unknown): string => {
    /**
     * Checks if error has message.
     *
     * @param e Error object.
     *
     * @returns True if error has message, false otherwise.
     */
    const isErrorWithMessage = (e: unknown): e is ErrorWithMessage => (
        typeof e === 'object'
        && e !== null
        && 'message' in e
        && typeof (e as Record<string, unknown>).message === 'string'
    );

    if (isErrorWithMessage(error)) {
        return error.message;
    }

    try {
        return (new Error(JSON.stringify(error))).message;
    } catch {
        // fallback in case there's an error stringifying the error
        // like with circular references for example.
        return (new Error(String(error))).message;
    }
};

/**
 * Returns the message of a value thrown by a function of the page, e.g. by an intercepted method, to be logged.
 *
 * Unlike `getErrorMessage()`, it does not convert a value without a message, e.g. by `JSON.stringify()`,
 * as it may be the method intercepted by the scriptlet which logs the error, e.g. `call-nothrow`
 * for `JSON.stringify`, which would be called again then, and repeat the side effects of the page,
 * e.g. of a `toJSON()` method which throws again, until the call stack is exceeded.
 * Only the `message` of an object is read, and a primitive, e.g. `null`, is converted to a string,
 * which calls no functions of the page. An error of reading the message, e.g. thrown by a getter of the page,
 * is not thrown, as it should not stop the scriptlet.
 *
 * @param value Value thrown by a function of the page.
 *
 * @returns Message of the value, or an empty string if it has no message or it cannot be read.
 */
export const getThrownValueMessage = (value: unknown): string => {
    if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
        return String(value);
    }

    try {
        const { message } = value as { message?: unknown };
        return typeof message === 'string' ? message : '';
    } catch {
        return '';
    }
};
