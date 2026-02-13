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

export function preventNavigation(source: Source, urlPattern?: string | RegExp): void {
    const nav = (window as any).navigation;
    if (!nav) {
        return;
    }

    const CURRENT_URL_PATTERN = 'location.href';
    const SHOULD_LOG: boolean = !urlPattern;
    let pattern: string | RegExp;

    if (urlPattern === CURRENT_URL_PATTERN) {
        pattern = window.location.href;
    } else if (typeof urlPattern === 'string') {
        pattern = toRegExp(urlPattern as string);
    } else {
        pattern = '';
    }

    const shouldPrevent = (patternUrl: string | RegExp, url: string): boolean => {
        // Match whole URL if pattern "location.href" is used, otherwise test regex pattern
        if (typeof patternUrl === 'string') {
            return url === patternUrl;
        }
        return patternUrl.test(url);
    };

    nav.addEventListener('navigate', (event: any) => {
        const destinationURL = event.destination.url;

        if (SHOULD_LOG) {
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
