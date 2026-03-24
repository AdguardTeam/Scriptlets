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
 * fetches their text content, applies a regex/string replacement, and delivers the
 * modified script before it is executed.
 *
 * **Delivery strategy** — automatically selected per interception:
 * - If the intercepted `src` is a `blob:` URL (blob: already proven CSP-allowed)
 *   or the element is already in the DOM, a new `blob:` URL is created with the
 *   modified text and assigned as `src` (original behaviour).
 * - Otherwise (e.g. a regular `https:` URL on a site that may block `blob:` via CSP),
 *   the modified text is injected directly into `script.textContent`
 *   and the `src` setter is skipped. When the element is later appended
 *   to the DOM it executes as an inline script. On sites that use nonces,
 *   the element's existing nonce is preserved so the inline execution passes CSP.
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
 * 1. Remove ad initialization code from blob scripts on mega.nz embed pages:
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
     * Fetches the script at srcUrl, applies the pattern→replacement,
     * and returns the modified text.
     * Returns null if the fetch fails or the pattern does not match.
     *
     * @param srcUrl Source URL being assigned.
     * @returns Modified script text, or null.
     */
    function getModifiedScriptText(srcUrl: string): string | null {
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

        return modifiedText;
    }

    /**
     * Determines whether to deliver the modified script via a new blob: URL
     * (original strategy) or via element.textContent (CSP-safe fallback).
     *
     * Blob strategy is used when:
     * - The element is already in the DOM (textContent won't re-execute), OR
     * - The original src is already a blob: URL (proves blob: is CSP-allowed), OR
     * - A <meta> CSP tag explicitly includes blob: in script-src / default-src.
     *
     * Otherwise the textContent strategy is used to avoid creating a blob: URL
     * that may be blocked by CSP (e.g. on youtube.com where CSP is header-based).
     *
     * @param el the script element being intercepted
     * @param srcUrl the src value being assigned
     * @returns true to use blob strategy, false to use textContent strategy
     */
    function shouldUseBlobStrategy(el: HTMLScriptElement, srcUrl: string): boolean {
        if (document.contains(el)) {
            return true;
        }
        if (srcUrl.startsWith('blob:')) {
            return true;
        }
        const metaElements = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
        for (let i = 0; i < metaElements.length; i += 1) {
            const content = metaElements[i].getAttribute('content') || '';
            if (/(?:script-src|default-src)[^;]*blob:/i.test(content)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Handles an intercepted src value: logs in logging mode, or applies
     * replacement in replacement mode.
     *
     * Returns:
     * - The original srcUrl (passthrough — logging mode, no match, or url filter miss)
     * - A new blob: URL (blob strategy — modified content delivered via src)
     * - null (textContent strategy — caller must set el.textContent and skip the setter)
     *
     * @param el Script element being intercepted.
     * @param srcUrl Src value being assigned.
     * @returns URL to assign, or null when textContent strategy is used.
     */
    function handleSrcAssignment(el: HTMLScriptElement, srcUrl: string): string | null {
        if (isLoggingMode) {
            logMessage(source, `script src assigned: ${srcUrl}`);
            return srcUrl;
        }

        if (urlMatchRegexp && !urlMatchRegexp.test(srcUrl)) {
            return srcUrl;
        }

        const modifiedText = getModifiedScriptText(srcUrl);
        if (modifiedText === null) {
            return srcUrl;
        }

        if (shouldUseBlobStrategy(el, srcUrl)) {
            if (isVerbose) {
                logMessage(source, 'Using blob strategy');
            }
            const blob = new Blob([modifiedText], { type: 'text/javascript' });
            hit(source);
            return URL.createObjectURL(blob);
        }

        if (isVerbose) {
            logMessage(source, 'Using textContent strategy (blob: may be CSP-blocked)');
        }

        el.textContent = modifiedText;
        hit(source);

        return null;
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
            const finalUrl = handleSrcAssignment(this as HTMLScriptElement, urlStr);

            // textContent strategy: el.textContent already set, skip the src setter
            if (finalUrl === null) {
                return;
            }

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
        const finalUrl = handleSrcAssignment(thisArg, urlStr);

        // textContent strategy: el.textContent already set, skip setAttribute
        if (finalUrl === null) {
            return;
        }

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
