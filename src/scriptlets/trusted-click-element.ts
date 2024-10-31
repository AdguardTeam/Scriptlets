import {
    hit,
    toRegExp,
    parseCookieString,
    throttle,
    logMessage,
    parseMatchArg,
    queryShadowSelector,
} from '../helpers/index';
import { Source } from '../../types/types';

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
 * example.com#%#//scriptlet('trusted-click-element', selectors[, extraMatch[, delay[, reload]]])
 * ```
 * <!-- markdownlint-disable-next-line line-length -->
 * - `selectors` — required, string with query selectors delimited by comma. The scriptlet supports `>>>` combinator to select elements inside open shadow DOM. For usage, see example below.
 * - `extraMatch` — optional, extra condition to check on a page;
 *    allows to match `cookie`, `localStorage` and specified text;
 * can be set as `name:key[=value]` where `value` is optional.
 * If `cookie`/`localStorage` starts with `!` then the element will only be clicked
 * if specified `cookie`/`localStorage` item does not exist.
 * Multiple conditions are allowed inside one `extraMatch` but they should be delimited by comma
 * and each of them should match the syntax. Possible `names`:
 *     - `cookie` — test string or regex against cookies on a page
 *     - `localStorage` — check if localStorage item is present
 *     - `containsText` — check if clicked element contains specified text
 * - `delay` — optional, time in ms to delay scriptlet execution, defaults to instant execution.
 *             Must be a number less than 10000 ms (10s)
 * - `reload` — optional, string with reloadAfterClick marker and optional value. Possible values:
 *     - `reloadAfterClick` - reloads the page after all elements have been clicked,
 *        with default delay — 500ms
 *     - colon-separated pair `reloadAfterClick:value` where
 *         - `value` — time delay in milliseconds before reloading the page, after all elements
 *            have been clicked. Must be a number less than 10000 ms (10s)
 *
 * <!-- markdownlint-disable line-length -->
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
 * 1. Click element only if clicked element contains text `Accept cookie`
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-click-element', 'button', 'containsText:Accept cookie')
 *     ```
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
 * 1. Click element inside open shadow DOM, which could be selected by `div > button`, but is inside shadow host element with host element selected by `article .container`
 *
 *    ```adblock
 *    example.com#%#//scriptlet('trusted-click-element', 'article .container > div#host >>> div > button')
 *    ```
 *
 * 1. Click elements after 1000ms delay and reload page after all elements have been clicked with 200ms delay
 *
 *    ```adblock
 *    example.com#%#//scriptlet('trusted-click-element', 'button[name="agree"], button[name="check"], input[type="submit"][value="akkoord"]', '', '1000', 'reloadAfterClick:200')
 *    ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * @added v1.7.3.
 */
/* eslint-enable max-len */
export function trustedClickElement(
    source: Source,
    selectors: string,
    extraMatch = '',
    delay = NaN,
    reload = '',
) {
    if (!selectors) {
        return;
    }

    const SHADOW_COMBINATOR = ' >>> ';
    const OBSERVER_TIMEOUT_MS = 10000;
    const THROTTLE_DELAY_MS = 20;
    const STATIC_CLICK_DELAY_MS = 150;
    const STATIC_RELOAD_DELAY_MS = 500;
    const COOKIE_MATCH_MARKER = 'cookie:';
    const LOCAL_STORAGE_MATCH_MARKER = 'localStorage:';
    const TEXT_MATCH_MARKER = 'containsText:';
    const RELOAD_ON_FINAL_CLICK_MARKER = 'reloadAfterClick';
    const SELECTORS_DELIMITER = ',';
    const COOKIE_STRING_DELIMITER = ';';
    const COLON = ':';
    // Regex to split match pairs by commas, avoiding the ones included in regexes
    const EXTRA_MATCH_DELIMITER = /(,\s*){1}(?=!?cookie:|!?localStorage:|containsText:)/;

    const sleep = (delayMs: number) => {
        return new Promise((resolve) => { setTimeout(resolve, delayMs); });
    };

    // If shadow combinator is present in selector, then override attachShadow and set mode to 'open'
    if (selectors.includes(SHADOW_COMBINATOR)) {
        const attachShadowWrapper = (
            target: typeof Element.prototype.attachShadow,
            thisArg: Element,
            argumentsList: any[],
        ) => {
            const mode = argumentsList[0]?.mode;
            if (mode === 'closed') {
                argumentsList[0].mode = 'open';
            }
            return Reflect.apply(target, thisArg, argumentsList);
        };

        const attachShadowHandler = {
            apply: attachShadowWrapper,
        };

        window.Element.prototype.attachShadow = new Proxy(window.Element.prototype.attachShadow, attachShadowHandler);
    }

    let parsedDelay;
    if (delay) {
        parsedDelay = parseInt(String(delay), 10);
        const isValidDelay = !Number.isNaN(parsedDelay) || parsedDelay < OBSERVER_TIMEOUT_MS;
        if (!isValidDelay) {
            // eslint-disable-next-line max-len
            const message = `Passed delay '${delay}' is invalid or bigger than ${OBSERVER_TIMEOUT_MS} ms`;
            logMessage(source, message);
            return;
        }
    }

    let canClick = !parsedDelay;

    const cookieMatches: string[] = [];
    const localStorageMatches: string[] = [];
    let textMatches = '';
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
            if (matchStr.includes(TEXT_MATCH_MARKER)) {
                const { matchValue } = parseMatchArg(matchStr);
                const textMatch = matchValue.replace(TEXT_MATCH_MARKER, '');
                textMatches = textMatch;
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

            return cookieKeys.some((cookieKey) => {
                const keysMatched = keyMatch.test(cookieKey);
                if (!keysMatched) {
                    return false;
                }

                // Key matching is enough if cookie value match is not specified
                if (!valueMatch) {
                    return true;
                }

                const parsedCookieValue = parsedCookies[cookieKey];

                if (!parsedCookieValue) {
                    return false;
                }

                return valueMatch.test(parsedCookieValue);
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

    const textMatchRegexp = textMatches ? toRegExp(textMatches) : null;

    /**
     * Checks if an element contains the specified text.
     *
     * @param element - The element to check.
     * @param matchRegexp - The text to match.
     * @returns True if the element contains the specified text, otherwise false.
     */
    const doesElementContainText = (
        element: Element,
        matchRegexp: RegExp,
    ): boolean => {
        const { textContent } = element;
        if (!textContent) {
            return false;
        }
        return matchRegexp.test(textContent);
    };

    /**
     * Create selectors array and swap selectors to null on finding it's element
     *
     * Selectors / nulls should not be (re)moved from array to:
     * - keep track of selectors order
     * - always know on what index corresponding element should be put
     * - prevent selectors from being queried multiple times
     */
    let selectorsSequence: Array<string | null> = selectors
        .split(SELECTORS_DELIMITER)
        .map((selector) => selector.trim());

    const createElementObj = (element: any): Object => {
        return {
            element: element || null,
            clicked: false,
        };
    };
    const elementsSequence = Array(selectorsSequence.length).fill(createElementObj(null));

    // Flag indicating if the reload is set
    let shouldReloadAfterClick: boolean = false;
    // Value used for reload timing
    let reloadDelayMs: number = STATIC_RELOAD_DELAY_MS;

    if (reload) {
        // split reload option by colon
        const [reloadMarker, reloadValue] = reload.split(COLON);

        if (reloadMarker !== RELOAD_ON_FINAL_CLICK_MARKER) {
            logMessage(source, `Passed reload option '${reload}' is invalid`);
            return;
        }

        // if reload value is set, will be used as a delay
        // if reload value is not set, default value will be used
        if (reloadValue) {
            const passedReload = Number(reloadValue);

            // check if passed reload value is a number
            if (Number.isNaN(passedReload)) {
                logMessage(source, `Passed reload delay value '${passedReload}' is invalid`);
                return;
            }

            // check if passed reload value is less than 10s
            if (passedReload > OBSERVER_TIMEOUT_MS) {
                // eslint-disable-next-line max-len
                logMessage(source, `Passed reload delay value '${passedReload}' is bigger than maximum ${OBSERVER_TIMEOUT_MS} ms`);
                return;
            }

            reloadDelayMs = passedReload;
        }

        shouldReloadAfterClick = true;
    }

    /**
     * Go through elementsSequence from left to right, clicking on found elements
     *
     * Element should not be clicked if it is already clicked,
     * or a previous element is not found or clicked yet
     */
    let canReload = true;
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
                if (textMatchRegexp && !doesElementContainText(elementObj.element, textMatchRegexp)) {
                    continue;
                }
                elementObj.element.click();
                elementObj.clicked = true;
            }
        }

        const allElementsClicked = elementsSequence
            .every((elementObj) => elementObj.clicked === true);

        if (allElementsClicked) {
            if (shouldReloadAfterClick && canReload) {
                canReload = false;
                setTimeout(() => {
                    window.location.reload();
                }, reloadDelayMs);
            }
            hit(source);
        }
    };

    const handleElement = (element: Element, i: number) => {
        const elementObj = createElementObj(element);
        elementsSequence[i] = elementObj;

        if (canClick) {
            clickElementsBySequence();
        }
    };

    /**
     * Processes a sequence of selectors, handling elements found in DOM (and shadow DOM),
     * and updates the sequence.
     *
     * @returns {string[]} The updated selectors sequence, with fulfilled selectors set to null.
     */
    const fulfillAndHandleSelectors = () => {
        const fulfilledSelectors: string[] = [];
        selectorsSequence.forEach((selector, i) => {
            if (!selector) {
                return;
            }
            const element = queryShadowSelector(selector);
            if (!element) {
                return;
            }

            handleElement(element, i);
            fulfilledSelectors.push(selector);
        });

        // selectorsSequence should be modified after the loop to not break loop indexation
        selectorsSequence = selectorsSequence.map((selector) => {
            return selector && fulfilledSelectors.includes(selector)
                ? null
                : selector;
        });

        return selectorsSequence;
    };

    /**
     * Queries all selectors from queue on each mutation
     *
     * We start looking for elements before possible delay is over, to avoid cases
     * when delay is getting off after the last mutation took place.
     *
     */
    const findElements = (mutations: MutationRecord[], observer: MutationObserver) => {
        // TODO: try to make the function cleaner — avoid usage of selectorsSequence from the outer scope
        selectorsSequence = fulfillAndHandleSelectors();

        // Disconnect observer after finding all elements
        const allSelectorsFulfilled = selectorsSequence.every((selector) => selector === null);
        if (allSelectorsFulfilled) {
            observer.disconnect();
        }
    };

    /**
     * Initializes a `MutationObserver` to watch for changes in the DOM.
     * The observer is set up to monitor changes in attributes, child nodes, and subtree.
     * A timeout is set to disconnect the observer if no elements are found within the specified time.
     */
    const initializeMutationObserver = () => {
        const observer = new MutationObserver(throttle(findElements, THROTTLE_DELAY_MS));
        observer.observe(document.documentElement, {
            attributes: true,
            childList: true,
            subtree: true,
        });

        // Set timeout to disconnect observer if elements are not found within the specified time
        setTimeout(() => observer.disconnect(), OBSERVER_TIMEOUT_MS);
    };

    /**
     * Checks if elements are already present in the DOM.
     * If elements are found, they are clicked.
     * If elements are not found, the observer is initialized.
     */
    const checkInitialElements = () => {
        const foundElements = selectorsSequence.every((selector) => {
            if (!selector) {
                return false;
            }
            const element = queryShadowSelector(selector);
            return !!element;
        });
        if (foundElements) {
            // Click previously collected elements
            fulfillAndHandleSelectors();
        } else {
            // Initialize MutationObserver if elements were not found initially
            initializeMutationObserver();
        }
    };

    // Run the initial check
    checkInitialElements();

    // If there's a delay before clicking elements, use a timeout
    if (parsedDelay) {
        setTimeout(() => {
            // Click previously collected elements
            clickElementsBySequence();
            canClick = true;
        }, parsedDelay);
    }
}

export const trustedClickElementNames = [
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
    queryShadowSelector,
];
