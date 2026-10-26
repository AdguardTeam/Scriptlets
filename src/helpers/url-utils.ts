/**
 * Gets the value of the URL parameter, as `url.searchParams.get()` does, except for '+' in URLs.
 *
 * '+' is decoded as a whitespace, unless the value is a URL which is not encoded, i.e. its raw value in the query
 * starts with a scheme and '//' or it is a path, e.g. '?url=https://example.org/c++/docs', since '+' is a part
 * of the URL then. Also, '+' in the query of the value is kept, since it means a whitespace there anyway,
 * e.g. '?url=page.html?q=a+b', but not in its hash, where '+' is not a whitespace.
 *
 * @param url The URL with the parameter.
 * @param name The name of the parameter, empty string for the parameter with empty name, e.g. '?=value'.
 *
 * @returns The value of the parameter, or empty string if there is no such parameter.
 */
export const getUrlParamValue = (url: URL, name: string): string => {
    const value = url.searchParams.get(name) || '';
    if (!value.includes(' ')) {
        return value;
    }

    // Raw value which is a URL that is not encoded, i.e. its slashes are not encoded,
    // e.g. 'https://example.org/' or 'https%3A//example.org/'
    const regexpNotEncodedURL = /^[a-z][a-z\d+.-]*(:|%3a)\/\//i;
    // Raw value which is a relative URL path, i.e. it starts with '/', './', '../' or '?'
    const regexpPath = /^(\.{0,2}\/|\?)/;

    // raw value of the first parameter with the name, as `searchParams.get()` returns
    const pairs = url.search.slice(1).split('&');
    for (let i = 0; i < pairs.length; i += 1) {
        // empty pair is skipped, as it is by `searchParams`, e.g. '?&=value' for the parameter with empty name
        if (!pairs[i]) {
            continue;
        }
        const separatorIndex = pairs[i].indexOf('=');
        const rawName = separatorIndex === -1 ? pairs[i] : pairs[i].slice(0, separatorIndex);
        // leading '&', so that leading '?' of the name is not stripped, as it is not by `searchParams`,
        // e.g. for '??url=' the name is '?url'
        if (!new URLSearchParams(`&${rawName}=`).has(name)) {
            continue;
        }
        const rawValue = separatorIndex === -1 ? '' : pairs[i].slice(separatorIndex + 1);
        // other percent-encoded characters are decoded as usual
        const valueWithPlus = new URLSearchParams(`value=${rawValue.replace(/\+/g, '%2B')}`).get('value') || '';
        if (regexpNotEncodedURL.test(rawValue) || regexpPath.test(rawValue)) {
            return valueWithPlus;
        }
        // Both values have the same length, since only '+' is decoded differently.
        // '+' is kept only in the query of the value, not in its hash, where it is not a whitespace,
        // e.g. '#/search?q=red+shoes' of a hash router, which has no query before its hash
        const queryIndex = valueWithPlus.indexOf('?');
        const hashIndex = valueWithPlus.indexOf('#');
        if (queryIndex === -1 || (hashIndex !== -1 && hashIndex < queryIndex)) {
            return value;
        }
        const queryEnd = hashIndex === -1 ? value.length : hashIndex;
        const query = valueWithPlus.slice(queryIndex, queryEnd);
        return `${value.slice(0, queryIndex)}${query}${value.slice(queryEnd)}`;
    }
    return value;
};
