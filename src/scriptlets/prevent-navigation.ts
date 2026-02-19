import { hit, logMessage, toRegExp } from '../helpers';
import { type Source } from './scriptlets';

/**
 * Extend global Window with a navigation-like API when available.
 */
declare global {
    interface Window {
        /**
         * The navigation read-only property of the Window interface
         * returns the current window's associated Navigation object.
         */
        navigation?: NavigationLike;
    }
}

/**
 * Minimal shape of the Navigation API object used by this scriptlet.
 */
type NavigateEventLike = Event & {
    /**
     * The destination read-only property of the NavigateEventLike interface
     * returns a NavigationDestination object representing the destination being navigated to.
     */
    destination: {
        /**
         * The URL of the destination.
         */
        url: string;
    };
};

/**
 * Minimal subset of the Navigation API used by this scriptlet.
 * Only includes `addEventListener('navigate', listener)`.
 */
type NavigationLike = {
    /**
     * Adds an event listener for the `navigate` event.
     *
     * @param type - Event name. Only `navigate` is used here. Fired when any type of navigation is initiated.
     * @param listener - The callback function to execute when the event occurs.
     */
    addEventListener: (
        type: 'navigate',
        listener: (event: NavigateEventLike) => void
    ) => void;
};

/**
 * @scriptlet prevent-navigation
 *
 * @description
 * Prevents navigation to URL matching the specified pattern by intercepting the `navigate` event.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('prevent-navigation'[, urlPattern])
 * ```
 *
 * - `urlPattern` — optional, string, regular expression or `location.href` keyword to match URL.
 *
 * > Usage with no arguments will log navigation attempts to browser console.
 *
 * ### Examples
 *
 * 1. Prevent navigation to URL containing `ads`:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-navigation', 'ads')
 *     ```
 *
 * 1. Prevent navigation to URLs matching regex:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-navigation', '/foo.*bar/')
 *     ```
 *
 * 1. Prevent `location.reload`:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-navigation', 'location.href')
 *     ```
 *
 * 1. Log all navigation attempts without blocking:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-navigation')
 *     ```
 *
 * @added v2.2.16.
 */
export function preventNavigation(source: Source, urlPattern?: string | RegExp | undefined): void {
    const nav = window.navigation;
    if (!nav) {
        return;
    }

    const currentUrlKeyword = 'location.href';
    const shouldLog: boolean = typeof urlPattern === 'undefined';
    let pattern: string | RegExp | null = null;

    if (urlPattern === currentUrlKeyword) {
        pattern = window.location.href;
    } else if (typeof urlPattern === 'string') {
        pattern = toRegExp(urlPattern);
    }

    const shouldPrevent = (patternUrl: string | RegExp | null, url: string): boolean => {
        if (!patternUrl) {
            return false;
        }
        // Match whole URL if pattern "location.href" is used, otherwise test regex pattern
        if (typeof patternUrl === 'string') {
            return url === patternUrl;
        }
        return patternUrl.test(url);
    };

    nav.addEventListener('navigate', (event: NavigateEventLike) => {
        const destinationURL = event?.destination?.url;

        if (!destinationURL) {
            return;
        }

        if (shouldLog) {
            hit(source);
            logMessage(source, `Navigating to: ${destinationURL}`);
            return;
        }

        if (shouldPrevent(pattern, destinationURL)) {
            event.preventDefault();
            hit(source);
            logMessage(source, `Blocked navigation to: ${destinationURL}`);
        }
    });
}

export const preventNavigationNames = [
    'prevent-navigation',
];

// eslint-disable-next-line prefer-destructuring
preventNavigation.primaryName = preventNavigationNames[0];

preventNavigation.injections = [
    hit,
    logMessage,
    toRegExp,
];
