import { hit } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet spoof-css
 *
 * @description
 * Spoof CSS property value when `getComputedStyle()` or `getBoundingClientRect()` methods is called.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#spoof-cssjs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('spoof-css', selectors, cssPropertyName, cssPropertyValue)
 * ```
 *
 * - `selectors` — string of comma-separated selectors to match
 * - `cssPropertyName` — CSS property name
 * - `cssPropertyValue` — CSS property value
 *
 * > Call with `debug` as `cssPropertyName` and `truthy` value as `cssPropertyValue` will trigger debugger statement
 * > when `getComputedStyle()` or `getBoundingClientRect()` methods is called.
 * > It may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * ### Examples
 *
 * 1. Spoof CSS property value `display` to `block` for all elements with class `adsbygoogle`:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('spoof-css', '.adsbygoogle', 'display', 'block')
 *     ```
 *
 * 2. Spoof CSS property value `height` to `100` for all elements with class `adsbygoogle` and `advert`:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('spoof-css', '.adsbygoogle, .advert', 'height', '100')
 *     ```
 *
 * 3. To invoke debugger statement:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('spoof-css', '.adsbygoogle', 'debug', 'true')
 *     ```
 *
 *
 * @added v1.10.1.
 */
/* eslint-enable max-len */

export function spoofCSS(source, selectors, cssPropertyName, cssPropertyValue) {
    if (!selectors) {
        return;
    }

    const uboAliases = [
        'spoof-css.js',
        'ubo-spoof-css.js',
        'ubo-spoof-css',
    ];

    /**
     * getComputedStyle uses camelCase version of CSS properties
     * for example, "clip-path" is displayed as "clipPath"
     * so it's needed to convert CSS property to camelCase
     *
     * @param {string} cssProperty
     * @returns {string} camelCase version of CSS property
     */
    function convertToCamelCase(cssProperty) {
        if (!cssProperty.includes('-')) {
            return cssProperty;
        }
        const splittedProperty = cssProperty.split('-');
        const firstPart = splittedProperty[0];
        const secondPart = splittedProperty[1];
        return `${firstPart}${secondPart[0].toUpperCase()}${secondPart.slice(1)}`;
    }

    const shouldDebug = !!(cssPropertyName === 'debug' && cssPropertyValue);

    const propToValueMap = new Map();

    /**
     * UBO spoof-css analog has it's own args sequence:
     * (selectors, ...arguments)
     * arguments contains property-name/property-value pairs, all separated by commas
     *
     * example.com##+js(spoof-css, a[href="x.com"]\, .ads\, .bottom, clip-path, none)
     * example.com##+js(spoof-css, .ad, clip-path, none, display, block)
     * example.com##+js(spoof-css, .ad, debug, 1)
     */
    if (uboAliases.includes(source.name)) {
        const { args } = source;
        let arrayOfProperties = [];
        // Check if one before last argument is 'debug'
        const isDebug = args.at(-2);
        if (isDebug === 'debug') {
            // If it's debug, then we need to skip first (selectors) and last two arguments
            arrayOfProperties = args.slice(1, -2);
        } else {
            // If it's not debug, then we need to skip only first (selectors) argument
            arrayOfProperties = args.slice(1);
        }
        for (let i = 0; i < arrayOfProperties.length; i += 2) {
            if (arrayOfProperties[i] === '') {
                break;
            }
            propToValueMap.set(convertToCamelCase(arrayOfProperties[i]), arrayOfProperties[i + 1]);
        }
    } else if (cssPropertyName && cssPropertyValue && !shouldDebug) {
        propToValueMap.set(convertToCamelCase(cssPropertyName), cssPropertyValue);
    }

    const spoofStyle = (cssProperty, realCssValue) => {
        return propToValueMap.has(cssProperty)
            ? propToValueMap.get(cssProperty)
            : realCssValue;
    };

    /**
     * Cloaks a function to make it appear as native code.
     *
     * This helps avoid detection by anti-adblock scripts that check:
     * - `fn.toString()` for native code appearance;
     * - `fn.toString.toString()` for nested toString checks;
     * - Error stack traces for 'Proxy' keyword.
     *
     * @param {Function} fn Function to cloak.
     * @param {object} thisArg `this` context to bind.
     * @param {string} fnName Name to use for the function.
     *
     * @returns {Function} Cloaked function.
     */
    const cloakFunc = (fn, thisArg, fnName) => {
        const cloakedToString = () => `function ${fnName}() { [native code] }`;
        // toString.toString() should return 'function toString() { [native code] }'
        const toStringOfToString = () => 'function toString() { [native code] }';
        toStringOfToString.toString = toStringOfToString;
        cloakedToString.toString = toStringOfToString;

        const bound = fn.bind(thisArg);
        Object.defineProperty(bound, 'name', { value: fnName });
        Object.defineProperty(bound, 'toString', { value: cloakedToString });
        return bound;
    };

    const setRectValue = (rect, prop, value) => {
        Object.defineProperty(
            rect,
            prop,
            {
                value: parseFloat(value),
            },
        );
    };

    /**
     * Creates a cloaked toString function for native-looking output.
     *
     * @param {string} fnName Function name to use in the output.
     *
     * @returns {Function} `toString` function that returns native code format.
     */
    const cloakedToStringFactory = (fnName) => {
        // Use named function expression so that .name returns 'toString'
        const toString = function toString() {
            return `function ${fnName}() { [native code] }`;
        };
        // toString.toString() should return 'function toString() { [native code] }'
        const toStringOfToString = function toString() {
            return 'function toString() { [native code] }';
        };
        toStringOfToString.toString = toStringOfToString;
        toString.toString = toStringOfToString;
        return toString;
    };

    // Properties that need to be bound to avoid 'Proxy' appearing in error stack traces
    const propsToBindSet = new Set([
        '__defineGetter__',
        '__defineSetter__',
        '__lookupGetter__',
        '__lookupSetter__',
    ]);

    const getter = (target, prop, receiver) => {
        hit(source);
        if (prop === 'toString') {
            return cloakedToStringFactory(target.name || 'getComputedStyle');
        }
        // Bind introspection methods to original target to avoid 'Proxy' in error stack
        if (propsToBindSet.has(prop)) {
            const nativeFn = target[prop];
            if (typeof nativeFn === 'function') {
                return nativeFn.bind(target);
            }
        }
        return Reflect.get(target, prop, receiver);
    };

    const getComputedStyleWrapper = (target, thisArg, args) => {
        if (shouldDebug) {
            debugger; // eslint-disable-line no-debugger
        }
        const style = Reflect.apply(target, thisArg, args);
        if (!args[0].matches(selectors)) {
            return style;
        }
        const proxiedStyle = new Proxy(style, {
            get(target, prop) {
                const CSSStyleProp = target[prop];

                if (typeof CSSStyleProp !== 'function') {
                    return spoofStyle(prop, CSSStyleProp || '');
                }

                if (prop !== 'getPropertyValue') {
                    // Use cloakFunc to avoid 'Proxy' in stack traces
                    return cloakFunc(CSSStyleProp, target, prop);
                }

                // Create a cloaked getPropertyValue function instead of using Proxy
                // This avoids 'Proxy' appearing in error stack traces
                const getPropertyValueWrapper = function getPropertyValue(cssPropName) {
                    const cssValue = target[cssPropName] || '';
                    return spoofStyle(cssPropName, cssValue);
                };

                return cloakFunc(getPropertyValueWrapper, target, 'getPropertyValue');
            },
            getOwnPropertyDescriptor(target, prop) {
                if (propToValueMap.has(prop)) {
                    return {
                        configurable: true,
                        enumerable: true,
                        value: propToValueMap.get(prop),
                        writable: true,
                    };
                }
                return Reflect.getOwnPropertyDescriptor(target, prop);
            },
        });
        hit(source);
        return proxiedStyle;
    };

    const getComputedStyleHandler = {
        apply: getComputedStyleWrapper,
        get: getter,
    };

    window.getComputedStyle = new Proxy(window.getComputedStyle, getComputedStyleHandler);

    const getBoundingClientRectWrapper = (target, thisArg, args) => {
        if (shouldDebug) {
            debugger; // eslint-disable-line no-debugger
        }
        const rect = Reflect.apply(target, thisArg, args);
        if (!thisArg.matches(selectors)) {
            return rect;
        }

        const {
            x,
            y,
            height,
            width,
        } = rect;

        const newDOMRect = new window.DOMRect(x, y, width, height);

        if (propToValueMap.has('top')) {
            setRectValue(newDOMRect, 'top', propToValueMap.get('top'));
        }
        if (propToValueMap.has('bottom')) {
            setRectValue(newDOMRect, 'bottom', propToValueMap.get('bottom'));
        }
        if (propToValueMap.has('left')) {
            setRectValue(newDOMRect, 'left', propToValueMap.get('left'));
        }
        if (propToValueMap.has('right')) {
            setRectValue(newDOMRect, 'right', propToValueMap.get('right'));
        }
        if (propToValueMap.has('height')) {
            setRectValue(newDOMRect, 'height', propToValueMap.get('height'));
        }
        if (propToValueMap.has('width')) {
            setRectValue(newDOMRect, 'width', propToValueMap.get('width'));
        }
        hit(source);
        return newDOMRect;
    };

    const getBoundingClientRectHandler = {
        apply: getBoundingClientRectWrapper,
        get: getter,
    };

    window.Element.prototype.getBoundingClientRect = new Proxy(
        window.Element.prototype.getBoundingClientRect,
        getBoundingClientRectHandler,
    );
}

export const spoofCSSNames = [
    'spoof-css',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'spoof-css.js',
    'ubo-spoof-css.js',
    'ubo-spoof-css',
];

// eslint-disable-next-line prefer-destructuring
spoofCSS.primaryName = spoofCSSNames[0];

spoofCSS.injections = [
    hit,
];
