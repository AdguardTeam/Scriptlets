/**
 * Decodes a value as `unescape()` of AppMeasurement, the library of Adobe Analytics, does:
 * `+` as a space, then `decodeURIComponent()`, or the legacy `unescape()` if the value is malformed.
 *
 * @param value Value to decode.
 * @returns Decoded value, or the value itself if it is empty.
 */
export function appMeasurementUnescape(value: string): string {
    if (!value) {
        return value;
    }
    const spaced = value.indexOf('+') >= 0 ? value.split('+').join(' ') : value;
    try {
        return decodeURIComponent(spaced);
    } catch (e) {
        // as the real one, e.g. for a truncated UTF-8 sequence
        return window.unescape(spaced);
    }
}

/**
 * Returns the value of a query parameter as `Util.getQueryParam()` of AppMeasurement does,
 * with its string algorithm rather than the URL parser, as pages may use the result for their own logic:
 * the query is the part after the first `?`, even after `#`, its parameters are separated by `delimiter`,
 * the first one named `key` is used, and its value is cut at `#`, e.g. `p#x?a=1` gives `1` for `a`.
 *
 * Requires `appMeasurementUnescape()` to be injected as well.
 *
 * @param key Parameter name.
 * @param url URL, e.g. `location.href`.
 * @param delimiter Parameter delimiter, `&` by default.
 * @param undefinedIfEmpty If set, `undefined` is returned for a parameter without a value, e.g. `?a` or `?a=`.
 * @returns Decoded value, `''` if there is none, or `undefined` as described above.
 */
export function getAppMeasurementQueryParam(
    key: unknown,
    url: unknown,
    delimiter?: unknown,
    undefinedIfEmpty?: unknown,
): string | undefined {
    const separator = delimiter ? String(delimiter) : '&';
    if (!key || !url) {
        return '';
    }
    const name = String(key);
    let rest = String(url);
    let index = rest.indexOf('?');
    if (index < 0) {
        return '';
    }
    rest = `${separator}${rest.substring(index + 1)}${separator}`;
    if (
        undefinedIfEmpty
        && (rest.indexOf(`${separator}${name}${separator}`) >= 0
            || rest.indexOf(`${separator}${name}=${separator}`) >= 0)
    ) {
        return undefined;
    }
    index = rest.indexOf('#');
    if (index >= 0) {
        rest = `${rest.substring(0, index)}${separator}`;
    }
    index = rest.indexOf(`${separator}${name}=`);
    if (index < 0) {
        return '';
    }
    rest = rest.substring(index + separator.length + name.length + 1);
    index = rest.indexOf(separator);
    if (index >= 0) {
        rest = rest.substring(0, index);
    }
    return rest.length > 0 ? appMeasurementUnescape(rest) : '';
}
