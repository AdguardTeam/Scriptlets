import {
    hit,
    toRegExp,
    logMessage,
    noopFunc,
} from '../helpers';
import { type Source } from './scriptlets';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-constructor
 *
 * @description
 * Prevents a constructor call if the constructor name
 * and optionally the first argument match the specified criteria.
 * This scriptlet is useful for blocking constructors like `Promise` or `MutationObserver`
 * that can be used to circumvent existing scriptlets like `prevent-addEventListener`.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('prevent-constructor', constructorName[, argumentSearch])
 * ```
 *
 * - `constructorName` — required, string, the name of the constructor to prevent,
 *   e.g., "Promise", "MutationObserver".
 *   Must be a property of the global `window` object.
 * - `argumentsMatch` — optional, string or regular expression,
 *   or JSON array of patterns matching arguments passed to the constructor.
 *   Defaults to match all constructors if not specified.
 *   Possible values:
 *     - string — matches the first argument only;
 *     - JSON array — matches arguments positionally, should be wrapped in `[]`;
 *       use `"*"` to skip positions, e.g., if only second argument should be matched.
 *       Invalid regular expression or JSON will cause exit and rule will not work.
 *
 * ### Examples
 *
 * 1. Prevent all `MutationObserver` constructor calls
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-constructor', 'MutationObserver')
 *     ```
 *
 * 1. Prevent `Promise` constructor calls where the first argument contains `adblock`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-constructor', 'Promise', 'adblock')
 *     ```
 *
 * 1. Prevent `MutationObserver` calls where the first argument matches a regexp
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-constructor', 'MutationObserver', '/detect.*ad/')
 *     ```
 *
 * 1. Prevent `MutationObserver` calls where the second argument contains `attributes`,
 *    and matching of the first argument is skipped
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-constructor', 'MutationObserver', '["*", "attributes"]')
 *     ```
 *
 * @added unknown
 */
/* eslint-enable max-len */
export function preventConstructor(
    source: Source,
    constructorName: string,
    argumentsMatch?: string,
) {
    if (!constructorName) {
        return;
    }

    const nativeConstructor = (window as any)[constructorName];

    if (typeof nativeConstructor !== 'function') {
        logMessage(source, `"${constructorName}" is not a function`);
        return;
    }

    /**
     * Checks if the argumentsMatch string represents a valid array of patterns
     * needed to match constructor arguments respectively.
     *
     * @param input The argumentsMatch string to parse.
     *
     * @returns Array of patterns or null if parsing fails.
     */
    const parseArgumentsMatchAsArray = (input: string | undefined): string[] | null => {
        if (!input) {
            return null;
        }

        if (
            input.trim().startsWith('[')
            && input.trim().endsWith(']')
        ) {
            try {
                const parsed = JSON.parse(input);

                if (Array.isArray(parsed)) {
                    return parsed.map((p: any) => String(p));
                }

                logMessage(source, 'Invalid argumentsMatch: not an array');

                return null;
            } catch (e) {
                logMessage(source, `Invalid JSON in argumentsMatch: ${input}`);

                return null;
            }
        }

        // Plain string - will be used for first argument matching
        return null;
    };

    const arrayArgPatterns = parseArgumentsMatchAsArray(argumentsMatch);

    /**
     * This flag allows to prevent infinite loops when trapping constructors
     * that are used by scriptlet's own code, e.g., RegExp used by toRegExp).
     */
    let isMatchingSuspended = false;

    const handlerWrapper = (target: any, args: any[], newTarget: any) => {
        // If matching is suspended, pass through to the original constructor
        // to avoid infinite recursion
        if (isMatchingSuspended) {
            return Reflect.construct(target, args, newTarget);
        }

        // Prevent matching to avoid infinite recursion
        isMatchingSuspended = true;

        let shouldPrevent = false;

        if (!argumentsMatch) {
            // No argument search specified - match all
            shouldPrevent = true;
        } else if (arrayArgPatterns !== null) {
            // Array syntax — match arguments positionally.
            // Assume it is matched until proven otherwise
            shouldPrevent = true;

            for (let i = 0; i < arrayArgPatterns.length; i += 1) {
                const pattern = arrayArgPatterns[i];

                // Some arguments may be skipped, e.g. ['*', 'callback']
                if (pattern === '*') {
                    continue;
                }

                // Check if argument exists at this position
                if (i >= args.length) {
                    // Pattern expects an argument that does not exist - do not match
                    // eslint-disable-next-line max-len
                    const msg = `Pattern expects argument at position ${i}, but constructor called with ${args.length} arguments`;
                    logMessage(source, msg);
                    shouldPrevent = false;
                    break;
                }

                const arg = args[i];
                let argStr: string;

                if (typeof arg === 'function') {
                    argStr = arg.toString();
                } else if (typeof arg === 'object' && arg !== null) {
                    try {
                        argStr = JSON.stringify(arg);
                    } catch (e) {
                        argStr = String(arg);
                    }
                } else {
                    argStr = String(arg);
                }

                const patternRegexp = toRegExp(pattern);

                if (!patternRegexp.test(argStr)) {
                    shouldPrevent = false;
                    break;
                }
            }
        } else {
            // if argumentsMatch is set and is not an array, it should be a plain string,
            // so only the first argument should be matched
            const firstArg = args[0];
            let firstArgStr: string;

            if (typeof firstArg === 'function') {
                firstArgStr = firstArg.toString();
            } else if (typeof firstArg === 'object' && firstArg !== null) {
                try {
                    firstArgStr = JSON.stringify(firstArg);
                } catch (e) {
                    firstArgStr = String(firstArg);
                }
            } else {
                firstArgStr = String(firstArg);
            }

            const argumentsMatchRegexp = toRegExp(argumentsMatch);
            shouldPrevent = argumentsMatchRegexp.test(firstArgStr);
        }

        if (!shouldPrevent) {
            isMatchingSuspended = false;
            return Reflect.construct(target, args, newTarget);
        }

        hit(source);
        // Construct with noop callback to prevent original code execution
        // while maintaining proper instanceof checks
        try {
            const result = Reflect.construct(target, [noopFunc], newTarget);
            isMatchingSuspended = false;
            return result;
        } catch (e) {
            // If construction fails, return an empty object with proper prototype
            isMatchingSuspended = false;
            return Object.create(target.prototype || null);
        }
    };

    const constructorHandler: ProxyHandler<typeof nativeConstructor> = {
        construct: handlerWrapper,
        get(target, prop, receiver) {
            if (prop === 'toString') {
                return Function.prototype.toString.bind(target);
            }
            return Reflect.get(target, prop, receiver);
        },
    };

    (window as any)[constructorName] = new Proxy(nativeConstructor, constructorHandler);
}

export const preventConstructorNames = [
    'prevent-constructor',
];

// eslint-disable-next-line prefer-destructuring
preventConstructor.primaryName = preventConstructorNames[0];

preventConstructor.injections = [
    hit,
    toRegExp,
    logMessage,
    noopFunc,
];
