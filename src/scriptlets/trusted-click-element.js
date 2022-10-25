import {
    hit,
    toRegExp,
    parseCookieString,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet trusted-click-element
 *
 * @description
 * Clicks selected elements in a strict sequence, ordered by selectors passed, and waiting for them to render in the DOM first.
 * Deactivates after all elements have been clicked or by 10s timeout.
 *
 * **Syntax**
 * ```
 * example.com#%#//scriptlet('trusted-click-element', selectors[, extraMatch[, delay]])
 * ```
 *
 * - `selectors` — required, string with query selectors delimited by comma
 * - `extraMatch` — optional, extra condition to check on a page; allows to match `cookie` and `localStorage`; can be set as `name:key[=value]` where `value` is optional.
 * Multiple conditions are allowed inside one `extraMatch` but they should be delimited by comma and each of them should match the syntax. Possible `name`s:
 *    - `cookie` - test string or regex against cookies on a page
 *    - `localStorage` - check if localStorage item is present
 * - 'delay' - optional, time in ms to delay scriptlet execution, defaults to instant execution.
 * **Examples**
 * 1. Click single element by selector
 * ```
 * example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]')
 * ```
 *
 * 2. Delay click execution by 500ms
 * ```
 * example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', '', '500')
 * ```
 *
 * 3. Click multiple elements by selector with a delay
 * ```
 * example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"], button[name='check"], input[type="submit"][value="akkoord"]', '', '500')
 * ```
 *
 * 4. Match cookies by keys using regex and string
 * ```
 * example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'cookie:userConsentCommunity, cookie:/cmpconsent|cmp/')
 * ```
 *
 * 5. Match by cookie key=value pairs using regex and string
 * ```
 * example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'cookie:userConsentCommunity=true, cookie:/cmpconsent|cmp/=/[a-z]{1,5}/')
 * ```
 *
 * 6. Match by localStorage item 'promo' key
 * ```
 * example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"]', 'localStorage:promo')
 * ```
 *
 * 7. Click multiple elements with delay and matching by both cookie string and localStorage item
 * ```
 * example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"], input[type="submit"][value="akkoord"]', 'cookie:cmpconsent, localStorage:promo', '250')
 * ```
 */
/* eslint-enable max-len */
export function trustedClickElement(source, selectors, extraMatch = '', delay = NaN) {
    if (!selectors) {
        return;
    }
    // eslint-disable-next-line no-console
    const log = console.log.bind(console);

    const OBSERVER_TIMEOUT_MS = 10000;
    const THROTTLE_DELAY_MS = 20;
    const COOKIE_MATCH_MARKER = 'cookie:';
    const LOCAL_STORAGE_MATCH_MARKER = 'localStorage:';
    const SELECTORS_DELIMITER = ',';
    const COOKIE_STRING_DELIMITER = ';';
    // Regex to split match pairs by commas, avoiding the ones included in regexes
    const EXTRA_MATCH_DELIMITER = /(,\s*){1}(?=cookie:|localStorage:)/;

    let parsedDelay;
    if (delay) {
        parsedDelay = parseInt(delay, 10);
        const isValidDelay = !Number.isNaN(parsedDelay) || parsedDelay < OBSERVER_TIMEOUT_MS;
        if (!isValidDelay) {
            log(`Passed delay '${delay}' is invalid or bigger than ${OBSERVER_TIMEOUT_MS} ms`);
            return;
        }
    }

    let canClick = !parsedDelay;

    const cookieMatches = [];
    const localStorageMatches = [];

    if (extraMatch) {
        // Get all match marker:value pairs from argument
        const parsedExtraMatch = extraMatch
            .split(EXTRA_MATCH_DELIMITER)
            .map((matchStr) => matchStr.trim());

        // Filter match pairs by marker
        parsedExtraMatch.forEach((matchStr) => {
            if (matchStr.indexOf(COOKIE_MATCH_MARKER) > -1) {
                const cookieMatch = matchStr.replace(COOKIE_MATCH_MARKER, '');
                cookieMatches.push(cookieMatch);
            }
            if (matchStr.indexOf(LOCAL_STORAGE_MATCH_MARKER) > -1) {
                const localStorageMatch = matchStr.replace(LOCAL_STORAGE_MATCH_MARKER, '');
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

        if (!cookiesMatched) {
            return;
        }
    }

    if (localStorageMatches.length > 0) {
        const localStorageMatched = localStorageMatches
            .every((str) => {
                const itemValue = window.localStorage.getItem(str);
                return itemValue || itemValue === '';
            });
        if (!localStorageMatched) {
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
    const clickElementsBySequence = () => {
        for (let i = 0; i < elementsSequence.length; i += 1) {
            const elementObj = elementsSequence[i];
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
            return fulfilledSelectors.indexOf(selector) === -1 ? selector : null;
        });

        // Disconnect observer after finding all elements
        const allSelectorsFulfilled = selectorsSequence.every((selector) => selector === null);
        if (allSelectorsFulfilled) {
            observer.disconnect();
        }
    };

    const throttle = (cb, ms) => {
        let wait = false;
        let savedArgs;
        const wrapper = (...args) => {
            if (wait) {
                savedArgs = args;
                return;
            }

            cb(...args);
            wait = true;

            setTimeout(() => {
                wait = false;
                if (savedArgs) {
                    wrapper(savedArgs);
                    savedArgs = null;
                }
            }, ms);
        };
        return wrapper;
    };

    // eslint-disable-next-line compat/compat
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
];
