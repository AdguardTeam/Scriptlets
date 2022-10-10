/**
 * Creates URL object if input string `url` is valid OR returns null for invalid input string
 * @param {string} url
 * @returns {URL | null}
 */
export const createUrlObject = (url) => {
    let validUrl;
    try {
        // URL API is not supported by IE and Opera Mini, but window.URL is
        // https://developer.mozilla.org/en-US/docs/Web/API/URL
        // eslint-disable-next-line compat/compat
        validUrl = new window.URL(url);
    } catch {
        validUrl = null;
    }
    return validUrl;
};
