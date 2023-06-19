/**
 * Conditionally logs message to console.
 * Convention is to log messages by source.verbose if such log
 * is not a part of scriptlet's functionality, eg on invalid input,
 * and use 'forced' argument otherwise.
 *
 * @param source required, scriptlet properties
 * @param message required, message to log
 * @param forced to log message unconditionally
 * @param convertMessageToString to convert message to string
 */
export const logMessage = (
    source: Source,
    message: unknown,
    forced = false,
    convertMessageToString = true,
) => {
    const {
        name,
        verbose,
    } = source;

    if (!forced && !verbose) {
        return;
    }

    // eslint-disable-next-line no-console
    const nativeConsole = console.log;

    if (!convertMessageToString) {
        // Template literals convert object to string,
        // so 'message' should not be passed to template literals
        // as it will not be logged correctly
        nativeConsole(`${name}:`, message);
        return;
    }

    nativeConsole(`${name}: ${message}`);
};
