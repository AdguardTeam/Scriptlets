import {
    hit,
    toRegExp,
    parseCookieString,
    throttle,
    logMessage,
    parseMatchArg,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-click-element
 *
 * @description
 * Clicks selected elements in a strict sequence, ordered by selectors passed,
 * and waiting for them to render in the DOM first.
 * Deactivates after all elements have been clicked or by 10s timeout.
 *
 * ### Syntax
 *
 * ```text
 * example.com#%#//scriptlet('trusted-click-element', selectors[, extraMatch[, delay]])
 * ```
 *
 * - `selectors` — required, string with query selectors delimited by comma
 * - `extraMatch` — optional, extra condition to check on a page; allows to match `cookie` and `localStorage`;
 * can be set as `name:key[=value]` where `value` is optional.
 * If `cookie`/`localStorage` starts with `!` then the element will only be clicked
 * if specified cookie/localStorage item does not exist.
 * Multiple conditions are allowed inside one `extraMatch` but they should be delimited by comma
 * and each of them should match the syntax. Possible `name`s:
 *     - `cookie` — test string or regex against cookies on a page
 *     - `localStorage` — check if localStorage item is present
 * - `delay` — optional, time in ms to delay scriptlet execution, defaults to instant execution.
 *
 * ### Examples
 *
 * 1. Click single element by selector
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]')
 *     ```
 *
 * 1. Delay click execution by 500ms
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', '', '500')
 *     ```
 *
 * 1. Click multiple elements by selector with a delay
 *
 *     <!-- markdownlint-disable line-length -->
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"], button[name="check"], input[type="submit"][value="akkoord"]', '', '500')
 *     ```
 *
 * 1. Match cookies by keys using regex and string
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'cookie:userConsentCommunity, cookie:/cmpconsent|cmp/')
 *     ```
 *
 * 1. Match by cookie key=value pairs using regex and string
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'cookie:userConsentCommunity=true, cookie:/cmpconsent|cmp/=/[a-z]{1,5}/')
 *     ```
 *
 * 1. Match by localStorage item 'promo' key
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'localStorage:promo')
 *     ```
 *
 * 1. Click multiple elements with delay and matching by both cookie string and localStorage item
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"], input[type="submit"][value="akkoord"]', 'cookie:cmpconsent, localStorage:promo', '250')
 *     ```
 *
 *     <!-- markdownlint-enable line-length -->
 *
 * 1. Click element only if cookie with name `cmpconsent` does not exist
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', '!cookie:cmpconsent')
 *     ```
 *
 * 1. Click element only if specified cookie string and localStorage item does not exist
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', '!cookie:consent, !localStorage:promo')
 *     ```
 *
 * @added v1.7.3.
 */
/* eslint-enable max-len */
export function trustedClickElement(source, selectors, extraMatch = '', delay = NaN) {
    if (!selectors) {
        return;
    }

    const OBSERVER_TIMEOUT_MS = 10000;
    const THROTTLE_DELAY_MS = 20;
    const STATIC_CLICK_DELAY_MS = 150;
    const COOKIE_MATCH_MARKER = 'cookie:';
    const LOCAL_STORAGE_MATCH_MARKER = 'localStorage:';
    const SELECTORS_DELIMITER = ',';
    const COOKIE_STRING_DELIMITER = ';';
    // Regex to split match pairs by commas, avoiding the ones included in regexes
    const EXTRA_MATCH_DELIMITER = /(,\s*){1}(?=!?cookie:|!?localStorage:)/;

    const sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

    let parsedDelay;
    if (delay) {
        parsedDelay = parseInt(delay, 10);
        const isValidDelay = !Number.isNaN(parsedDelay) || parsedDelay < OBSERVER_TIMEOUT_MS;
        if (!isValidDelay) {
            // eslint-disable-next-line max-len
            const message = `Passed delay '${delay}' is invalid or bigger than ${OBSERVER_TIMEOUT_MS} ms`;
            logMessage(source, message);
            return;
        }
    }

    let canClick = !parsedDelay;

    const cookieMatches = [];
    const localStorageMatches = [];
    let isInvertedMatchCookie = false;
    let isInvertedMatchLocalStorage = false;

    if (extraMatch) {
        // Get all match marker:value pairs from argument
        const parsedExtraMatch = extraMatch
            .split(EXTRA_MATCH_DELIMITER)
            .map((matchStr) => matchStr.trim());

        // Filter match pairs by marker
        parsedExtraMatch.forEach((matchStr) => {
            if (matchStr.includes(COOKIE_MATCH_MARKER)) {
                const { isInvertedMatch, matchValue } = parseMatchArg(matchStr);
                isInvertedMatchCookie = isInvertedMatch;
                const cookieMatch = matchValue.replace(COOKIE_MATCH_MARKER, '');
                cookieMatches.push(cookieMatch);
            }
            if (matchStr.includes(LOCAL_STORAGE_MATCH_MARKER)) {
                const { isInvertedMatch, matchValue } = parseMatchArg(matchStr);
                isInvertedMatchLocalStorage = isInvertedMatch;
                const localStorageMatch = matchValue.replace(LOCAL_STORAGE_MATCH_MARKER, '');
                localStorageMatches.push(localStorageMatch);
            }
        });
    }

    if (cookieMatches.length > 0) {
        const parsedCookieMatches = parseCookieString(cookieMatches.join(COOKIE_STRING_DELIMITER));
        const parsedCookies = parseCookieString(document.cookie);
        const cookieKeys = Object.keys(parsedCookies);
        if (cookieKeys.length === 0) {
            return;
        }

        const cookiesMatched = Object.keys(parsedCookieMatches).every((key) => {
            // Avoid getting /.?/ result from toRegExp on undefined
            // as cookie may be set without value,
            // on which cookie parsing will return cookieKey:undefined pair
            const valueMatch = parsedCookieMatches[key] ? toRegExp(parsedCookieMatches[key]) : null;
            const keyMatch = toRegExp(key);

            return cookieKeys.some((key) => {
                const keysMatched = keyMatch.test(key);
                if (!keysMatched) {
                    return false;
                }

                // Key matching is enough if cookie value match is not specified
                if (!valueMatch) {
                    return true;
                }

                return valueMatch.test(parsedCookies[key]);
            });
        });

        const shouldRun = cookiesMatched !== isInvertedMatchCookie;
        if (!shouldRun) {
            return;
        }
    }

    if (localStorageMatches.length > 0) {
        const localStorageMatched = localStorageMatches
            .every((str) => {
                const itemValue = window.localStorage.getItem(str);
                return itemValue || itemValue === '';
            });

        const shouldRun = localStorageMatched !== isInvertedMatchLocalStorage;
        if (!shouldRun) {
            return;
        }
    }

    /**
     * Create selectors array and swap selectors to null on finding it's element
     *
     * Selectors / nulls should not be (re)moved from array to:
     * - keep track of selectors order
     * - always know on what index corresponding element should be put
     * - prevent selectors from being queried multiple times
     */
    let selectorsSequence = selectors
        .split(SELECTORS_DELIMITER)
        .map((selector) => selector.trim());

    const createElementObj = (element) => {
        return {
            element: element || null,
            clicked: false,
        };
    };
    const elementsSequence = Array(selectorsSequence.length).fill(createElementObj());

    /**
     * Go through elementsSequence from left to right, clicking on found elements
     *
     * Element should not be clicked if it is already clicked,
     * or a previous element is not found or clicked yet
     */
    const clickElementsBySequence = async () => {
        for (let i = 0; i < elementsSequence.length; i += 1) {
            const elementObj = elementsSequence[i];
            // Add a delay between clicks to every element except the first one
            // https://github.com/AdguardTeam/Scriptlets/issues/284
            if (i >= 1) {
                await sleep(STATIC_CLICK_DELAY_MS);
            }
            // Stop clicking if that pos element is not found yet
            if (!elementObj.element) {
                break;
            }
            // Skip already clicked elements
            if (!elementObj.clicked) {
                elementObj.element.click();
                elementObj.clicked = true;
            }
        }

        const allElementsClicked = elementsSequence
            .every((elementObj) => elementObj.clicked === true);
        if (allElementsClicked) {
            // At this stage observer is already disconnected
            hit(source);
        }
    };

    const handleElement = (element, i) => {
        const elementObj = createElementObj(element);
        elementsSequence[i] = elementObj;

        if (canClick) {
            clickElementsBySequence();
        }
    };

    /**
     * Query all selectors from queue on each mutation
     * Each selector is swapped to null in selectorsSequence on founding corresponding element
     *
     * We start looking for elements before possible delay is over, to avoid cases
     * when delay is getting off after the last mutation took place.
     *
     */
    const findElements = (mutations, observer) => {
        const fulfilledSelectors = [];
        selectorsSequence.forEach((selector, i) => {
            if (!selector) {
                return;
            }
            const element = document.querySelector(selector);
            if (!element) {
                return;
            }

            handleElement(element, i);
            fulfilledSelectors.push(selector);
        });

        // selectorsSequence should be modified after the loop to not break loop indexation
        selectorsSequence = selectorsSequence.map((selector) => {
            return fulfilledSelectors.includes(selector) ? null : selector;
        });

        // Disconnect observer after finding all elements
        const allSelectorsFulfilled = selectorsSequence.every((selector) => selector === null);
        if (allSelectorsFulfilled) {
            observer.disconnect();
        }
    };

    const observer = new MutationObserver(throttle(findElements, THROTTLE_DELAY_MS));
    observer.observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true,
    });

    if (parsedDelay) {
        setTimeout(() => {
            // Click previously collected elements
            clickElementsBySequence();
            canClick = true;
        }, parsedDelay);
    }

    setTimeout(() => observer.disconnect(), OBSERVER_TIMEOUT_MS);
}

trustedClickElement.names = [
    'trusted-click-element',
    // trusted scriptlets support no aliases
];

trustedClickElement.injections = [
    hit,
    toRegExp,
    parseCookieString,
    throttle,
    logMessage,
    parseMatchArg,
];
