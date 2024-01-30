import {
    hit,
} from '../helpers/index';

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
 * example.org#%#//scriptlet('spoof-css', selectors, cssNameProperty, cssNameValue)
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
 * @added unknown.
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

    const setRectValue = (rect, prop, value) => {
        Object.defineProperty(
            rect,
            prop,
            {
                value: parseFloat(value),
            },
        );
    };

    const getter = (target, prop, receiver) => {
        hit(source);
        if (prop === 'toString') {
            return target.toString.bind(target);
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
                    return CSSStyleProp.bind(target);
                }

                const getPropertyValueFunc = new Proxy(CSSStyleProp, {
                    apply(target, thisArg, args) {
                        const cssName = args[0];
                        const cssValue = thisArg[cssName];
                        return spoofStyle(cssName, cssValue);
                    },
                    get: getter,
                });

                return getPropertyValueFunc;
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
            top,
            bottom,
            height,
            width,
            left,
            right,
        } = rect;

        const newDOMRect = new window.DOMRect(rect.x, rect.y, top, bottom, width, height, left, right);

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

spoofCSS.names = [
    'spoof-css',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'spoof-css.js',
    'ubo-spoof-css.js',
    'ubo-spoof-css',
];

spoofCSS.injections = [
    hit,
];
