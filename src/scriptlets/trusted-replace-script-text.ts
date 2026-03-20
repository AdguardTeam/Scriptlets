import {
    hit,
    logMessage,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    safeGetDescriptor,
    getTrustedTypesApi,
    nativeIsNaN,
} from '../helpers';
import { type Source } from './scriptlets';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-replace-script-text
 *
 * @description
 * Intercepts scripts loaded via `HTMLScriptElement.src` (including `blob:` URLs),
 * fetches their text content, applies a regex/string replacement, and re-assigns
 * a new `blob:` URL with the modified text before the script is executed.
 *
 * This fills the gap between `prevent-element-src-loading` (which can only block)
 * and `trusted-replace-xhr-response` (which targets `XMLHttpRequest` calls).
 * It is particularly useful for intercepting dynamically created blob scripts
 * that cannot be matched by URL-based network rules.
 *
 * > Usage with no arguments will log all `src` assignments on `<script>` elements
 * > to the browser console; it may be useful for debugging but is not allowed
 * > in production filter lists.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-replace-script-text'[, pattern, replacement[, urlToMatch[, verbose]]])
 * ```
 *
 * - `pattern` — optional, string or regular expression for matching the script
 *   text content that should be replaced. If set, `replacement` is required.
 *   Possible values:
 *     - non-empty string
 *     - regular expression, e.g. `/pattern/flags`
 *   By default only the first occurrence is replaced. To replace all occurrences
 *   use the `g` flag in a RegExp, e.g. `/pattern/g`.
 * - `replacement` — optional, required if `pattern` is set. String to replace
 *   the matched content with. Use empty string to remove the matched content.
 * - `urlToMatch` — optional, string or regular expression for filtering which
 *   `src` assignments trigger the interception. If omitted, all `<script src>`
 *   assignments are intercepted.
 * - `verbose` — optional, if set to `'true'` will log original and modified
 *   script text content to the console.
 *   > `verbose` is not allowed in production filter lists.
 *
 * ### Examples
 *
 * <!-- markdownlint-disable line-length -->
 *
 * 1. Log all script `src` assignments (debugging mode):
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-script-text')
 *     ```
 *
 * 1. Replace matched content in any script loaded via `src`:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-script-text', 'var adEnabled = true', 'var adEnabled = false')
 *     ```
 *
 * 1. Remove ad initialisation code from blob scripts on mega.nz embed pages:
 *
 *     ```adblock
 *     mega.nz#%#//scriptlet('trusted-replace-script-text', '/adPattern/g', '', 'blob:')
 *     ```
 *
 * 1. Replace content only in scripts whose `src` matches a pattern:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-script-text', 'adsEnabled', '', 'ads-sdk.js')
 *     ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * @added v2.3.0.
 */
/* eslint-enable max-len */
export function trustedReplaceScriptText(
    source: Source,
    pattern = '',
    replacement = '',
    urlToMatch = '',
    verbose = '',
) {
    const isLoggingMode = !pattern;
    const isVerbose = verbose === 'true';

    if (pattern && !replacement && replacement !== '') {
        logMessage(source, 'replacement is required when pattern is set');
        return;
    }

    const urlMatchRegexp = urlToMatch ? toRegExp(urlToMatch) : null;
    const patternRegexp = pattern ? toRegExp(pattern) : null;

    const policy = getTrustedTypesApi(source);

    /**
     * Fetches the content of a URL synchronously using XMLHttpRequest.
     *
     * @param url the URL to fetch (blob: or http(s):)
     * @returns the response text, or null on failure
     */
    function fetchContentSync(url: string): string | null {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            xhr.send();
            return xhr.responseText;
        } catch (e) {
            logMessage(source, `Failed to fetch script content from ${url}: ${e}`);
            return null;
        }
    }

    /**
     * Core replacement logic shared by the setter and setAttribute interceptors.
     * Fetches the script at srcUrl, applies the pattern→replacement, creates a
     * new blob URL with the modified text, and returns it.
     * Returns null if the fetch fails or the pattern does not match.
     *
     * @param srcUrl the src URL being assigned
     * @returns new blob URL with modified content, or null
     */
    function getReplacedBlobUrl(srcUrl: string): string | null {
        const originalText = fetchContentSync(srcUrl);
        if (originalText === null) {
            return null;
        }

        if (isVerbose) {
            logMessage(source, `Original script text:\n${originalText}`);
        }

        if (!patternRegexp || !patternRegexp.test(originalText)) {
            return null;
        }

        // Reset lastIndex for stateful regexps
        patternRegexp.lastIndex = 0;
        const modifiedText = originalText.replace(patternRegexp, replacement);

        if (isVerbose) {
            logMessage(source, `Modified script text:\n${modifiedText}`);
        }

        const blob = new Blob([modifiedText], { type: 'text/javascript' });
        return URL.createObjectURL(blob);
    }

    /**
     * Handles an intercepted src value: logs in logging mode, or applies
     * replacement in replacement mode.
     * Returns the URL to actually assign (possibly a new blob URL),
     * or the original srcUrl as fallback.
     *
     * @param srcUrl the src value being assigned
     * @returns URL to assign to the element
     */
    function handleSrcAssignment(srcUrl: string): string {
        if (isLoggingMode) {
            logMessage(source, `script src assigned: ${srcUrl}`);
            return srcUrl;
        }

        if (urlMatchRegexp && !urlMatchRegexp.test(srcUrl)) {
            return srcUrl;
        }

        const newUrl = getReplacedBlobUrl(srcUrl);
        if (newUrl === null) {
            return srcUrl;
        }

        hit(source);
        return newUrl;
    }

    const origSrcDescriptor = safeGetDescriptor(HTMLScriptElement.prototype as unknown as PropertyDescriptorMap, 'src');
    if (!origSrcDescriptor || typeof origSrcDescriptor.set !== 'function') {
        logMessage(source, 'Could not retrieve HTMLScriptElement.prototype.src descriptor');
        return;
    }

    const origSrcSetter = origSrcDescriptor.set;

    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        enumerable: true,
        configurable: true,
        get() {
            return origSrcDescriptor.get!.call(this);
        },
        set(urlValue: string | object) {
            const urlStr = String(urlValue);
            const finalUrl = handleSrcAssignment(urlStr);

            let assignValue: string | object = finalUrl;

            if (
                typeof (window as any).TrustedScriptURL !== 'undefined'
                && policy?.isSupported
                && urlValue instanceof (window as any).TrustedScriptURL
            ) {
                assignValue = policy.createScriptURL(finalUrl);
            }

            origSrcSetter.call(this, assignValue);
        },
    });

    const setAttributeWrapper = (
        target: typeof Element.prototype.setAttribute,
        thisArg: Element,
        args: [string, string],
    ): void => {
        if (!args[0] || !args[1] || !(thisArg instanceof HTMLScriptElement)) {
            Reflect.apply(target, thisArg, args);
            return;
        }

        const attrName = args[0].toLowerCase();
        if (attrName !== 'src') {
            Reflect.apply(target, thisArg, args);
            return;
        }

        const urlStr = String(args[1]);
        const finalUrl = handleSrcAssignment(urlStr);
        Reflect.apply(target, thisArg, [args[0], finalUrl]);
    };

    Element.prototype.setAttribute = new Proxy(Element.prototype.setAttribute, {
        apply: setAttributeWrapper,
    });

    if (isLoggingMode) {
        logMessage(source, 'Logging mode: intercepting all script src assignments');
    }
}

export const trustedReplaceScriptTextNames = [
    'trusted-replace-script-text',
    // trusted scriptlets support no aliases
];

// eslint-disable-next-line prefer-destructuring
trustedReplaceScriptText.primaryName = trustedReplaceScriptTextNames[0];

trustedReplaceScriptText.injections = [
    hit,
    logMessage,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    safeGetDescriptor,
    getTrustedTypesApi,
    nativeIsNaN,
];
