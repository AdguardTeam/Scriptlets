import { hit, logMessage, toRegExp } from '../helpers';
import { type Source } from './scriptlets';

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
 * @added unknown.
 */
declare global {
    interface Window {
        navigation?: NavigationLike;
    }
}

type NavigateEventLike = Event & {
    destination: {
        url: string;
    };
};
type NavigationLike = {
    addEventListener: (
        type: 'navigate',
        listener: (event: NavigateEventLike) => void
    ) => void;
};
export function preventNavigation(source: Source, urlPattern?: string | RegExp | undefined): void {
    const nav = window.navigation;
    if (!nav) {
        return;
    }

    const currentUrlKeyword = 'location.href';
    const shouldLog: boolean = !urlPattern;
    let pattern: string | RegExp | null = null;

    if (urlPattern === currentUrlKeyword) {
        pattern = window.location.href;
    } else if (typeof urlPattern === 'string') {
        pattern = toRegExp(urlPattern as string);
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

    nav.addEventListener('navigate', (event) => {
        const destinationURL = event?.destination?.url;

        if (!destinationURL || typeof destinationURL !== 'string') {
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
