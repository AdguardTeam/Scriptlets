import {
    hit,
    logMessage,
    parseMatchArg,
    isValidMatchStr,
    // following helpers are needed for helpers above
    toRegExp,
    escapeRegExp,
    isValidStrPattern,
} from '../helpers';

/**
 * @scriptlet prevent-canvas
 *
 * @description
 * Prevents calls to `HTMLCanvasElement.prototype.getContext` and returns `null`.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#prevent-canvasjs-
 *
 * ### Syntax
 *
 * ```adblock
 * example.org#%#//scriptlet('prevent-canvas'[, contextType])
 * ```
 *
 * - `contextType` — optional, string matching the context type (e.g., '2d', 'webgl');
 *   by default it matches all context types.
 *   It can be a string pattern or a regular expression pattern.
 *   If the pattern starts with `!`, it will be negated.
 *
 * ### Examples
 *
 * 1. Prevent all canvas contexts
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-canvas')
 *     ```
 *
 * 1. Prevent only '2d' canvas contexts
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-canvas', '2d')
 *     ```
 *
 * 1. Prevent all canvas contexts except '2d'
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-canvas', '!2d')
 *     ```
 *
 * @added unknown.
 */
export function preventCanvas(source: Source, contextType?: string) {
    const handlerWrapper = (
        target: HTMLCanvasElement['getContext'],
        thisArg: HTMLCanvasElement,
        argumentsList: string[],
    ) => {
        const type = argumentsList[0];
        let shouldPrevent = false;
        if (!contextType) {
            shouldPrevent = true;
        } else if (isValidMatchStr(contextType)) {
            const { isInvertedMatch, matchRegexp } = parseMatchArg(contextType);
            shouldPrevent = matchRegexp.test(type) !== isInvertedMatch;
        } else {
            logMessage(source, `Invalid contextType parameter: ${contextType}`);
            shouldPrevent = false;
        }
        if (shouldPrevent) {
            hit(source);
            return null;
        }
        return Reflect.apply(target, thisArg, argumentsList);
    };

    const canvasHandler = {
        apply: handlerWrapper,
    };

    window.HTMLCanvasElement.prototype.getContext = new Proxy(
        window.HTMLCanvasElement.prototype.getContext,
        canvasHandler,
    );
}

preventCanvas.names = [
    'prevent-canvas',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'prevent-canvas.js',
    'ubo-prevent-canvas.js',
    'ubo-prevent-canvas',
];

preventCanvas.injections = [
    hit,
    logMessage,
    parseMatchArg,
    isValidMatchStr,
    toRegExp,
    escapeRegExp,
    isValidStrPattern,
];
