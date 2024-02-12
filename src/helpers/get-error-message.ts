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
